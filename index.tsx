import {Context, Hono} from 'hono';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';
import {BlankEnv, BlankInput} from 'hono/types';
import {html} from 'hono/html';
import moment from 'moment';
import _ from 'lodash';
import axios from 'axios';

import {generateM3u} from './services/generate-m3u';
import {initDirectories} from './services/init-directories';
import {generateXml} from './services/generate-xmltv';
import {launchChannel} from './services/launch-channel';
import {scheduleEntries} from './services/build-schedule';
import {espnHandler} from './services/espn-handler';
import {
  cleanEntries,
  clearChannels,
  removeAllEntries,
  removeChannelStatus,
  resetSchedule,
} from './services/shared-helpers';
import {appStatus} from './services/app-status';
import {SERVER_PORT} from './services/port';
import {providers} from './services/providers';

import {version} from './package.json';

import {Layout} from './views/Layout';
import {Header} from './views/Header';
import {Main} from './views/Main';
import {Links} from './views/Links';
import {Style} from './views/Style';
import {Providers} from './views/Providers';
import {Script} from './views/Script';
import {Tools} from './views/Tools';
import {Options} from './views/Options';

import {ESPNPlus} from './services/providers/espn-plus/views';

import {
  initMiscDb,
  resetLinearStartChannel,
  setLinear,
  setNumberofChannels,
  setProxySegments,
  setStartChannel,
  usesLinear,
  setXmltvPadding,
  setEventFilters,
} from './services/misc-db-service';
import {generateM3uIptv} from './services/generate-iptv';
import {generateJson} from './services/generate-json';

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

  await Promise.all([espnHandler.getSchedule()]);

  console.log('=== Done getting events ===');
  console.log('=== Building the schedule ===');

  await cleanEntries();
  await scheduleEntries();

  console.log('=== Done building the schedule ===');
};

const app = new Hono();

app.use('/node_modules/*', serveStatic({root: './'}));
app.use('/favicon.ico', serveStatic({root: './'}));

app.route('/', providers);

app.get('/', async c => {
  return c.html(
    html`<!DOCTYPE html>${(
        <Layout>
          <Header />
          <Main>
            <Links baseUrl={getUri(c)} />
            <Tools />
            <Options />
            <Providers>
              <ESPNPlus />
            </Providers>
          </Main>
          <Style />
          <Script />
        </Layout>
      )}`,
  );
});

app.post('/rebuild-epg', async c => {
  await removeAllEntries();
  await schedule();

  return c.html(<Tools />, 200, {
    'HX-Trigger': `{"HXToast":{"type":"success","body":"Successfully rebuilt EPG"}}`,
  });
});

app.post('/reset-channels', async c => {
  clearChannels();

  return c.html(<Tools />, 200, {
    'HX-Trigger': `{"HXToast":{"type":"success","body":"Successfully cleared channels"}}`,
  });
});

app.post('/start-channel', async c => {
  const body = await c.req.parseBody();
  const startChannel = _.toNumber(body['start-channel']);

  if (_.isNaN(startChannel) || startChannel < 1 || startChannel > 10000) {
    return c.html(<Options />, 200, {
      'HX-Trigger': `{"HXToast":{"type":"error","body":"Starting channel must be a valid number"}}`,
    });
  }

  await setStartChannel(startChannel);
  await resetLinearStartChannel();
  await resetSchedule();
  await scheduleEntries();

  return c.html(<Options />, 200, {
    'HX-Trigger': `{"HXToast":{"type":"success","body":"Successfully saved starting channel number"}}`,
  });
});

app.post('/num-of-channels', async c => {
  const body = await c.req.parseBody();
  const numChannels = _.toNumber(body['num-of-channels']);

  if (_.isNaN(numChannels) || numChannels < 0 || numChannels > 5000) {
    return c.html(<Options />, 200, {
      'HX-Trigger': `{"HXToast":{"type":"error","body":"Number of channels must be a valid number"}}`,
    });
  }

  await setNumberofChannels(numChannels);
  await resetLinearStartChannel();
  await resetSchedule();
  await scheduleEntries();

  return c.html(<Options />, 200, {
    'HX-Trigger': `{"HXToast":{"type":"success","body":"Successfully saved number of channels"}}`,
  });
});

app.post('/linear-channels', async c => {
  const body = await c.req.parseBody();
  const enabled = body['linear-channels'] === 'on';

  await setLinear(enabled);

  if (enabled) {
    await removeAllEntries();
    await schedule();
  } else {
    await scheduleEntries();
  }

  return c.html(
    <input
      hx-target="this"
      hx-swap="outerHTML"
      hx-trigger="change"
      hx-post="/linear-channels"
      name="linear-channels"
      type="checkbox"
      role="switch"
      checked={enabled}
      data-enabled={enabled ? 'true' : 'false'}
    />,
    200,
    {
      'HX-Trigger': `{"HXRefresh": true, "HXToast":{"type":"success","body":"Successfully ${
        enabled ? 'enabled' : 'disabled'
      } dedicated linear channels. Page will refresh momentarily"}}`,
    },
  );
});

app.post('/proxy-segments', async c => {
  const body = await c.req.parseBody();
  const enabled = body['proxy-segments'] === 'on';

  await setProxySegments(enabled);

  return c.html(
    <input
      hx-post="/proxy-segments"
      hx-target="this"
      hx-swap="outerHTML"
      hx-trigger="change"
      name="proxy-segments"
      type="checkbox"
      role="switch"
      checked={enabled}
      data-enabled={enabled ? 'true' : 'false'}
    />,
    200,
    {
      'HX-Trigger': `{"HXToast":{"type":"success","body":"Successfully ${
        enabled ? 'enabled' : 'disabled'
      } proxying of segment files"}}`,
    },
  );
});

app.post('/xmltv-padding', async c => {
  const body = await c.req.parseBody();
  const enabled = body['xmltv-padding'] === 'on';

  await setXmltvPadding(enabled);

  return c.html(
    <input
      hx-post="/xmltv-padding"
      hx-target="this"
      hx-swap="outerHTML"
      hx-trigger="change"
      name="xmltv-padding"
      type="checkbox"
      role="switch"
      checked={enabled}
      data-enabled={enabled ? 'true' : 'false'}
    />,
    200,
    {
      'HX-Trigger': `{"HXToast":{"type":"success","body":"Successfully ${
        enabled ? 'enabled' : 'disabled'
      } XMLTV padding"}}`,
    },
  );
});

app.put('/event-filters', async c => {
  const body = await c.req.parseBody();
  const category_filter = body['category-filter'].toString();
  const title_filter = body['title-filter'].toString();

  await setEventFilters(category_filter, title_filter);
  await resetSchedule();
  await scheduleEntries();

  return c.html(
    <button type="submit" id="event-filters-button">
      Save and Apply Event Filters
    </button>,
    200,
    {
      'HX-Trigger': `{"HXToast":{"type":"success","body":"Successfully saved and applied event filters"}}`,
    },
  );
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

app.get('/channels.json', async c => {
  const data = await generateJson(getUri(c));
  if (!data) {
    return notFound(c);
  }
  return c.body(JSON.stringify(data), 200, {
    'Content-Type': 'application/json',
  });
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

app.get('/linear-channels.m3u', async c => {
  const useLinear = await usesLinear();

  if (!useLinear) {
    return notFound(c);
  }

  const m3uFile = await generateM3u(getUri(c), true);

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

  await Promise.all([espnHandler.initialize()]);

  await Promise.all([espnHandler.refreshTokens()]);

  serve(
    {
      fetch: app.fetch,
      port: SERVER_PORT,
    },
    () => {
      console.log(`Server started on port ${SERVER_PORT}`);
      schedule();
    },
  );
})();

// Check for events every 4 hours and set the schedule
setInterval(async () => {
  await schedule();
}, 1000 * 60 * 60 * 4);

// Check for updated refresh tokens 30 minutes
setInterval(() => Promise.all([espnHandler.refreshTokens()]), 1000 * 60 * 30);

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
