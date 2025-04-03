import axios from 'axios';
import moment, {Moment} from 'moment-timezone';

import {userAgent, androidMlbUserAgent} from './user-agent';
import {ClassTypeWithoutMethods, IEntry, TChannelPlaybackInfo} from './shared-interfaces';
import {db} from './database';
import {iptv} from './supabase';

interface IEntitlement {
  code: string;
}

export interface MLBTeam {
  name: string;
  slug: string;
}

export const mlbTeams: MLBTeam[] = [
  {name: 'Chicago White Sox', slug: 'chicago-white-sox'},
  {name: 'Cleveland Guardians', slug: 'cleveland-guardians'},
  {name: 'Detroit Tigers', slug: 'detroit-tigers'},
  {name: 'Kansas City Royals', slug: 'kansas-city-royals'},
  {name: 'Minnesota Twins', slug: 'minnesota-twins'},
  {name: 'Baltimore Orioles', slug: 'baltimore-orioles'},
  {name: 'Boston Red Sox', slug: 'boston-red-sox'},
  {name: 'New York Yankees', slug: 'new-york-yankees'},
  {name: 'Tampa Bay Rays', slug: 'tampa-bay-rays'},
  {name: 'Toronto Blue Jays', slug: 'toronto-blue-jays'},
  {name: 'Athletics', slug: 'athletics'},
  {name: 'Houston Astros', slug: 'houston-astros'},
  {name: 'Los Angeles Angels', slug: 'los-angeles-angels'},
  {name: 'Seattle Mariners', slug: 'seattle-mariners'},
  {name: 'Texas Rangers', slug: 'texas-rangers'},
  {name: 'Chicago Cubs', slug: 'chicago-cubs'},
  {name: 'Cincinnati Reds', slug: 'cincinnati-reds'},
  {name: 'Milwaukee Brewers', slug: 'milwaukee-brewers'},
  {name: 'Pittsburgh Pirates', slug: 'pittsburgh-pirates'},
  {name: 'St. Louis Cardinals', slug: 'st-louis-cardinals'},
  {name: 'Atlanta Braves', slug: 'atlanta-braves'},
  {name: 'Miami Marlins', slug: 'miami-marlins'},
  {name: 'New York Mets', slug: 'new-york-mets'},
  {name: 'Philadelphia Phillies', slug: 'philadelphia-phillies'},
  {name: 'Washington Nationals', slug: 'washington-nationals'},
  {name: 'Arizona Diamondbacks', slug: 'arizona-diamondbacks'},
  {name: 'Colorado Rockies', slug: 'colorado-rockies'},
  {name: 'Los Angeles Dodgers', slug: 'los-angeles-dodgers'},
  {name: 'San Diego Padres', slug: 'san-diego-padres'},
  {name: 'San Francisco Giants', slug: 'san-francisco-giants'},
];

const GRAPHQL_URL = ['https://', 'media-gateway.mlb.com', '/graphql'].join('');

const COMMON_HEADERS = {
  'cache-control': 'no-cache',
  origin: 'https://www.mlb.com',
  pragma: 'no-cache',
  priority: 'u=1, i',
  referer: 'https://www.mlb.com/',
  'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="8"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': userAgent,
};

class MLBHandler {
  public device_id?: string;
  public refresh_token?: string;
  public expires_at?: number;
  public access_token?: string;
  public session_id?: string;
  public entitlements?: IEntitlement[];

  private playback_token?: string;
  private playback_token_exp?: Moment;

  public initialize = async () => {
    await this.load();
  };

  public refreshTokens = async () => {
    await this.load();
  };

  public getSchedule = async (): Promise<void> => {
    try {
      const {result: events} = await iptv.getEntries('mlbtv');
      for (const event of events) {
        if (!event || !event.id) {
          continue;
        }

        const entryExists = await db.entries.findOneAsync<IEntry>({id: event.id});

        if (!entryExists) {
          await db.entries.insertAsync<IEntry>(event);
        }
      }
    } catch (e) {
      console.error(e);
      console.log('Could not parse MLB.tv events');
    }
  };

  public getEventData = async (mediaId: string, adCapabilities = 'NONE'): Promise<TChannelPlaybackInfo> => {
    try {
      await this.getSession();

      if (mediaId.indexOf('Big Inning - ') > -1) {
        const streamInfoUrl = await this.getBigInningInfo();
        const streamUrl = await this.getBigInningStream(streamInfoUrl);

        return [streamUrl, {}];
      } else if (mediaId.indexOf('MLB Network - ') > -1) {
        const streamUrl = await this.getMlbNetworkStream();

        return [streamUrl, {}];
      } else if (mediaId.indexOf('SNY - ') > -1) {
        return this.getStream('SNY_LIVE');
      } else if (mediaId.indexOf('SNLA - ') > -1) {
        return this.getStream('SNLA_LIVE');
      }

      const params = {
        operationName: 'initPlaybackSession',
        query:
          'mutation initPlaybackSession(\n        $adCapabilities: [AdExperienceType]\n        $mediaId: String!\n        $deviceId: String!\n        $sessionId: String!\n        $quality: PlaybackQuality\n    ) {\n        initPlaybackSession(\n            adCapabilities: $adCapabilities\n            mediaId: $mediaId\n            deviceId: $deviceId\n            sessionId: $sessionId\n            quality: $quality\n        ) {\n            playbackSessionId\n            playback {\n                url\n                token\n                expiration\n                cdn\n            }\n            adScenarios {\n                adParamsObj\n                adScenarioType\n                adExperienceType\n            }\n            adExperience {\n                adExperienceTypes\n                adEngineIdentifiers {\n                    name\n                    value\n                }\n                adsEnabled\n            }\n            heartbeatInfo {\n                url\n                interval\n            }\n            trackingObj\n        }\n    }',
        variables: {
          adCapabilities: [adCapabilities],
          deviceId: this.device_id,
          mediaId,
          quality: 'PLACEHOLDER',
          sessionId: this.session_id,
        },
      };

      const {data} = await axios.post(GRAPHQL_URL, params, {
        headers: {
          ...COMMON_HEADERS,
          ...this.getGraphQlHeaders(),
        },
      });

      const playbackUrl = data.data.initPlaybackSession.playback.url;
      const token = data.data.initPlaybackSession.playback.token;

      if (token) {
        this.playback_token = token;
        this.playback_token_exp = moment(data.data.initPlaybackSession.playback.expiration);
      }

      return [
        playbackUrl,
        {
          accept: 'application/json, text/plain, */*',
          'accept-encoding': 'identity',
          'accept-language': 'en-US,en;q=0.5',
          connection: 'keep-alive',
        },
      ];
    } catch (e) {
      console.error(e);
      console.log('Could not start playback');
    }
  };

  private getBigInningInfo = async (): Promise<string> => {
    try {
      const url = ['https://', 'dapi.mlbinfra.com', '/v2', '/content', '/en-us', '/vsmcontents', '/big-inning'].join(
        '',
      );

      const {data} = await axios.get(url, {
        headers: {
          'User-Agent': androidMlbUserAgent,
        },
      });

      if (data.references?.video.length > 0) {
        return data.references.video[0].fields.url;
      } else {
        throw new Error('Big Inning data not ready yet');
      }
    } catch (e) {
      console.error(e);
      console.log('Big Inning data not ready yet');
    }
  };

  private getBigInningStream = async (url: string): Promise<string> => {
    try {
      const {data} = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.access_token}`,
          'User-Agent': androidMlbUserAgent,
        },
      });

      return data.data[0].value;
    } catch (e) {
      console.error(e);
      console.log('Could not get Big Inning stream info');
    }
  };

  private getMlbNetworkStream = async (): Promise<string> => {
    try {
      const url = ['https://', 'falcon.mlbinfra.com', '/api/v1/', 'mvpds/mlbn/feeds'].join('');

      const {data} = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.access_token}`,
          'User-Agent': userAgent,
        },
      });

      return data.url;
    } catch (e) {
      console.error(e);
      console.log('Could not get MLB Network stream info');
    }
  };

  private getStream = async (network: string): Promise<TChannelPlaybackInfo> => {
    try {
      const params = {
        operationName: 'contentCollections',
        query:
          'query contentCollections(\n        $categories: [ContentGroupCategory!]\n        $includeRestricted: Boolean = false\n        $includeSpoilers: Boolean = false\n        $limit: Int = 10,\n        $skip: Int = 0\n    ) {\n        contentCollections(\n            categories: $categories\n            includeRestricted: $includeRestricted\n            includeSpoilers: $includeSpoilers\n            limit: $limit\n            skip: $skip\n        ) {\n            title\n            category\n            contents {\n                assetTrackingKey\n                contentDate\n                contentId\n                contentRestrictions\n                description\n                duration\n                language\n                mediaId\n                officialDate\n                title\n                mediaState {\n                    state\n                    mediaType\n                }\n                thumbnails {\n                    thumbnailType\n                    templateUrl\n                    thumbnailUrl\n                }\n            }\n        }\n    }',
        variables: {
          categories: [network],
          limit: 25,
        },
      };
      const {data} = await axios.post(GRAPHQL_URL, params, {
        headers: {
          ...COMMON_HEADERS,
          ...this.getGraphQlHeaders(),
        },
      });

      const availableStreams = data?.data?.contentCollections?.[0]?.contents;

      let [url, headers]: Partial<TChannelPlaybackInfo> = [, {}];
      let hasValidStream = false;

      for (const stream of availableStreams) {
        if (hasValidStream) {
          continue;
        }

        try {
          [url, headers] = await this.getEventData(stream.mediaId);

          await axios.get(url, {
            headers: {
              ...headers,
            },
          });

          hasValidStream = true;
        } catch (e) {}
      }

      if (hasValidStream && url) {
        return [url, headers];
      }

      throw new Error(`Could not find stream for ${network}!`);
    } catch (e) {
      console.log(`Could not find stream for ${network}!`);
    }
  };

  private getSession = async (): Promise<void> => {
    try {
      const params = {
        operationName: 'initSession',
        query:
          'mutation initSession($device: InitSessionInput!, $clientType: ClientType!, $experience: ExperienceTypeInput) {\n    initSession(device: $device, clientType: $clientType, experience: $experience) {\n        deviceId\n        sessionId\n        entitlements {\n            code\n        }\n        location {\n            countryCode\n            regionName\n            zipCode\n            latitude\n            longitude\n        }\n        clientExperience\n        features\n    }\n  }',
        variables: {
          clientType: 'WEB',
          device: {
            appVersion: '7.8.1',
            deviceFamily: 'desktop',
            knownDeviceId: this.device_id,
            languagePreference: 'ENGLISH',
            manufacturer: 'Apple',
            model: 'Macintosh',
            os: 'macos',
            osVersion: '10.15',
          },
        },
      };

      const {data} = await axios.post(GRAPHQL_URL, params, {
        headers: {
          ...COMMON_HEADERS,
          ...this.getGraphQlHeaders(),
        },
      });

      this.session_id = data.data.initSession.sessionId;
      this.entitlements = data.data.initSession.entitlements;
    } catch (e) {
      console.error(e);
      console.log('Could not get session id');
    }
  };

  private getGraphQlHeaders = () => ({
    accept: 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.5',
    authorization: 'Bearer ' + this.access_token,
    connection: 'keep-alive',
    'content-type': 'application/json',
    'x-client-name': 'WEB',
    'x-client-version': '7.8.1',
  });

  private load = async (): Promise<void> => {
    const {
      result: {data},
    } = await iptv.getProvider('mlbtv');
    const {device_id, access_token, expires_at, refresh_token} = data;

    this.device_id = device_id;
    this.access_token = access_token;
    this.expires_at = expires_at;
    this.refresh_token = refresh_token;
  };
}

export type TMLBTokens = ClassTypeWithoutMethods<MLBHandler>;

export const mlbHandler = new MLBHandler();
