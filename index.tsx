import {Context, Hono} from 'hono';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';
import {BlankEnv, BlankInput} from 'hono/types';
import moment from 'moment';

import axios from 'axios';

import fs from 'fs';
import {createServer} from 'node:https';

import {generateM3u} from './services/generate-m3u';
import {generateXml} from './services/generate-xmltv';
import {launchChannel} from './services/launch-channel';
import {scheduleEntries} from './services/build-schedule';
import {espnHandler} from './services/espn-handler';
import {mlbHandler} from './services/mlb-handler';

import {cleanEntries, removeChannelStatus} from './services/shared-helpers';
import {appStatus} from './services/app-status';
import {SERVER_PORT} from './services/port';

import {version} from './package.json';

import {usesLinear, initMiscDb} from './services/misc-db-service';
import {generateM3uIptv, generateM3uTeam, generateM3uTeams} from './services/generate-iptv';

import {initDirectories} from './services/init-directories';

// Check for SSL environment variables
const sslCertificatePath = process.env.SSL_CERTIFICATE_PATH;
const sslPrivateKeyPath = process.env.SSL_PRIVATEKEY_PATH;

// Set timeout of requests to 1 minute
axios.defaults.timeout = 1000 * 60;

const notFound = (c: Context<BlankEnv, '', BlankInput>) => {
  return c.text('404 not found', 404, {
    'X-Tuner-Error': 'EPlusTV: Error getting content',
  });
};

const shutDown = () => process.exit(0);

const getUri = (c: Context<BlankEnv, '', BlankInput>): string => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  const protocol = c.req.header('x-forwarded-proto') || 'http';
  const host = c.req.header('host') || '';

  return `${protocol}://${host}`;
};

const schedule = async () => {
  console.log('=== Getting events ===');

  await Promise.all([espnHandler.getSchedule(), mlbHandler.getSchedule()]);

  console.log('=== Done getting events ===');
  console.log('=== Building the schedule ===');

  await cleanEntries();
  await scheduleEntries();

  console.log('=== Done building the schedule ===');
};

const app = new Hono();

app.use('/favicon.ico', serveStatic({root: './'}));

app.get('/', async c => {
  return notFound(c);
});

app.get('/channels-iptv.m3u', async c => {
  const m3uFile = await generateM3uIptv(getUri(c));

  if (!m3uFile) {
    return notFound(c);
  }

  return c.body(m3uFile, 200, {
    'Content-Type': 'text/plain',
  });
});

app.get('/teams.m3u', async c => {
  const m3uFile = await generateM3uTeams(getUri(c));

  if (!m3uFile) {
    return notFound(c);
  }

  return c.body(m3uFile, 200, {
    'Content-Type': 'text/plain',
  });
});

app.get('/team/:team{.+\\.m3u$}', async c => {
  const team = c.req.param('team').split('.m3u')[0];

  const m3uFile = await generateM3uTeam(getUri(c), team, false);

  if (!m3uFile) {
    return notFound(c);
  }

  return c.body(m3uFile, 200, {
    'Content-Type': 'text/plain',
  });
});

app.get('/provider/:provider{.+\\.m3u$}', async c => {
  const provider = c.req.param('provider').split('.m3u')[0];

  const m3uFile = await generateM3uIptv(getUri(c), false, provider);

  if (!m3uFile) {
    return notFound(c);
  }

  return c.body(m3uFile, 200, {
    'Content-Type': 'text/plain',
  });
});

app.get('/channels.m3u', async c => {
  const m3uFile = await generateM3u(getUri(c));

  if (!m3uFile) {
    return notFound(c);
  }

  return c.body(m3uFile, 200, {
    'Content-Type': 'application/x-mpegurl',
  });
});

app.get('/linear-channels.m3u', async c => {
  const useLinear = await usesLinear();

  if (!useLinear) {
    return notFound(c);
  }

  const m3uFile = await generateM3u(getUri(c), true, c.req.query('gracenote') === 'exclude');

  if (!m3uFile) {
    return notFound(c);
  }

  return c.body(m3uFile, 200, {
    'Content-Type': 'application/x-mpegurl',
  });
});

app.get('/xmltv.xml', async c => {
  const xmlFile = await generateXml();

  if (!xmlFile) {
    return notFound(c);
  }

  return c.body(xmlFile, 200, {
    'Content-Type': 'application/xml',
  });
});

app.get('/linear-xmltv.xml', async c => {
  const useLinear = await usesLinear();

  if (!useLinear) {
    return notFound(c);
  }

  const xmlFile = await generateXml(true);

  if (!xmlFile) {
    return notFound(c);
  }

  return c.body(xmlFile, 200, {
    'Content-Type': 'application/xml',
  });
});

app.get('/channels/:id{.+\\.m3u8$}', async c => {
  const id = c.req.param('id').split('.m3u8')[0];

  let contents: string | undefined;

  // Channel data needs initial object
  if (!appStatus.channels[id]) {
    appStatus.channels[id] = {};
  }

  const uri = getUri(c);

  if (!appStatus.channels[id].player?.playlist) {
    try {
      await launchChannel(id, uri);
    } catch (e) {}
  }

  try {
    contents = appStatus.channels[id].player?.playlist;
  } catch (e) {}

  if (!contents) {
    console.log(
      `Could not get a playlist for channel #${id}. Please make sure there is an event scheduled and you have access to it.`,
    );

    removeChannelStatus(id);

    return notFound(c);
  }

  appStatus.channels[id].heartbeat = new Date();

  return c.body(contents, 200, {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/vnd.apple.mpegurl',
  });
});

app.get('/chunklist/:id/:chunklistid{.+\\.m3u8$}', async c => {
  const id = c.req.param('id');
  const chunklistid = c.req.param('chunklistid').split('.m3u8')[0];

  let contents: string | undefined;

  if (!appStatus.channels[id]?.player?.playlist) {
    return notFound(c);
  }

  try {
    contents = await appStatus.channels[id].player.cacheChunklist(chunklistid);
  } catch (e) {}

  if (!contents) {
    console.log(`Could not get chunklist for channel #${id}.`);
    removeChannelStatus(id);
    return notFound(c);
  }

  appStatus.channels[id].heartbeat = new Date();

  return c.body(contents, 200, {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/vnd.apple.mpegurl',
  });
});

app.get('/channels/:id/:part{.+\\.key$}', async c => {
  const id = c.req.param('id');
  const part = c.req.param('part').split('.key')[0];

  let contents: ArrayBuffer | undefined;

  try {
    contents = await appStatus.channels[id].player?.getSegmentOrKey(part);
  } catch (e) {
    return notFound(c);
  }

  if (!contents) {
    return notFound(c);
  }

  appStatus.channels[id].heartbeat = new Date();

  return c.body(contents, 200, {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/octet-stream',
  });
});

app.get('/channels/:id/:part{.+\\.ts$}', async c => {
  const id = c.req.param('id');
  const part = c.req.param('part').split('.ts')[0];

  let contents: ArrayBuffer | undefined;

  try {
    contents = await appStatus.channels[id].player?.getSegmentOrKey(part);
  } catch (e) {
    return notFound(c);
  }

  if (!contents) {
    return notFound(c);
  }

  return c.body(contents, 200, {
    'Cache-Control': 'no-cache',
    'Content-Type': 'video/MP2T',
  });
});

app.get('/channels/:id/:part{.+\\.m4i$}', async c => {
  const id = c.req.param('id');
  const part = c.req.param('part').split('.m4i')[0];

  let contents: ArrayBuffer | undefined;

  try {
    contents = await appStatus.channels[id].player?.getSegmentOrKey(part);
  } catch (e) {
    return notFound(c);
  }

  if (!contents) {
    return notFound(c);
  }

  return c.body(contents, 200, {
    'Cache-Control': 'no-cache',
    'Content-Type': 'video/MP2T',
  });
});

// 404 Handler
app.notFound(notFound);

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

(async () => {
  console.log(`=== E+TV v${version} starting ===`);
  initDirectories();

  await initMiscDb();

  await Promise.all([espnHandler.initialize(), mlbHandler.initialize()]);

  await Promise.all([espnHandler.refreshTokens(), mlbHandler.refreshTokens()]);
  if (sslCertificatePath && sslPrivateKeyPath) {
    serve(
      {
        createServer,
        fetch: app.fetch,
        port: SERVER_PORT,
        serverOptions: {
          cert: fs.readFileSync(sslCertificatePath),
          key: fs.readFileSync(sslPrivateKeyPath),
        },
      },
      () => {
        console.log(`HTTPS server started on port ${SERVER_PORT}`);
        schedule();
      },
    );
  } else {
    // Fall back to HTTP if SSL env variables are not provided
    serve(
      {
        fetch: app.fetch,
        port: SERVER_PORT,
      },
      () => {
        console.log(`HTTP server started on port ${SERVER_PORT}`);
        schedule();
      },
    );
  }
})();

// Check for events every 4 hours and set the schedule
setInterval(async () => {
  await schedule();
}, 1000 * 60 * 60 * 4);

// Check for updated refresh tokens 30 minutes
setInterval(() => Promise.all([espnHandler.refreshTokens(), mlbHandler.refreshTokens()]), 1000 * 60 * 30);

// Remove idle playlists
setInterval(() => {
  const now = moment();

  for (const key of Object.keys(appStatus.channels)) {
    if (appStatus.channels[key] && appStatus.channels[key].heartbeat) {
      const channelHeartbeat = moment(appStatus.channels[key].heartbeat);

      if (now.diff(channelHeartbeat, 'minutes') > 5) {
        console.log(`Channel #${key} has been idle for more than 5 minutes. Removing playlist info.`);
        removeChannelStatus(key);
      }
    } else {
      console.log(`Channel #${key} was setup improperly... Removing.`);
      removeChannelStatus(key);
    }
  }
}, 1000 * 60);
