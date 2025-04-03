import https from 'https';
import axios from 'axios';

import {userAgent} from './user-agent';
import {IAdobeAuth} from './adobe-helpers';
import {ClassTypeWithoutMethods, IEntry, IHeaders, TChannelPlaybackInfo} from './shared-interfaces';
import {db} from './database';
import {iptv} from './supabase';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// For `watch.graph.api.espn.com` URLs
const instance = axios.create({
  httpsAgent,
});

interface IEndpoint {
  href: string;
  headers: {
    [key: string]: string;
  };
  method: 'POST' | 'GET';
}

interface IAppConfig {
  services: {
    account: {
      client: {
        endpoints: {
          createAccountGrant: IEndpoint;
        };
      };
    };
    token: {
      client: {
        endpoints: {
          exchange: IEndpoint;
        };
      };
    };
    device: {
      client: {
        endpoints: {
          createAccountGrant: IEndpoint;
          createDeviceGrant: IEndpoint;
        };
      };
    };
  };
}

interface IToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface IGrant {
  grant_type: string;
  assertion: string;
}

interface ITokens extends IToken {
  ttl: number;
  refresh_ttl: number;
  swid: string;
  id_token: string;
}

export interface IEspnPlusMeta {
  use_ppv?: boolean;
  hide_studio?: boolean;
  zip_code?: string;
  in_market_teams?: string;
}

export interface IEspnMeta {
  sec_plus?: boolean;
  accnx?: boolean;
  espn3?: boolean;
  espn3isp?: boolean;
}

const BAM_APP_CONFIG =
  'https://bam-sdk-configs.bamgrid.com/bam-sdk/v2.0/espn-a9b93989/browser/v3.4/linux/chrome/prod.json';

class EspnHandler {
  public tokens?: ITokens;
  public account_token?: IToken;
  public device_token_exchange?: IToken;
  public device_refresh_token?: IToken;
  public device_grant?: IGrant;
  public id_token_grant?: IGrant;
  public device_token_exchange_expires?: number;
  public device_refresh_token_expires?: number;
  public account_token_expires?: number;

  public adobe_device_id?: string;
  public adobe_auth?: IAdobeAuth;

  private appConfig: IAppConfig;
  private graphQlApiKey: string;

  public initialize = async () => {
    // Load tokens from local file and make sure they are valid
    await this.load();
    await this.getGraphQlApiKey();

    if (!this.appConfig) {
      await this.getAppConfig();
    }
  };

  public refreshTokens = async () => {
    await this.load();
  };

  public getSchedule = async (): Promise<void> => {
    try {
      const {result: events} = await iptv.getEntries('espn');
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
      console.log('Could not parse events');
      console.log(e.message);
    }
  };

  public getEventData = async (eventId: string): Promise<TChannelPlaybackInfo> => {
    try {
      const {data: scenarios} = await instance.get('https://watch.graph.api.espn.com/api', {
        params: {
          apiKey: this.graphQlApiKey,
          query: `{airing(id:"${eventId}",countryCode:"us",deviceType:SETTOP,tz:"Z") {id name description mrss:adobeRSS authTypes requiresLinearPlayback status:type startDateTime endDateTime duration source(authorization: SHIELD) { url authorizationType hasEspnId3Heartbeats hasNielsenWatermarks hasPassThroughAds commercialReplacement startSessionUrl } network { id type name adobeResource } image { url } sport { name code uid } league { name uid } program { code categoryCode isStudio } seekInSeconds simulcastAiringId airingId tracking { nielsenCrossId1 trackingId } eventId packages { name } language tier feedName brands { id name type }}}`,
        },
      });

      if (!scenarios?.data?.airing?.source?.url.length || scenarios?.data?.airing?.status !== 'LIVE') {
        // console.log('Event status: ', scenarios?.data?.airing?.status);
        throw new Error('No streaming data available');
      }

      const scenarioUrl = scenarios.data.airing.source.url.replace('{scenario}', 'browser~ssai');

      let isEspnPlus = true;
      let headers: IHeaders = {};
      let uri: string;

      if (scenarios?.data?.airing?.source?.authorizationType === 'SHIELD') {
        // console.log('Scenario: ', scenarios?.data?.airing);
        isEspnPlus = false;
      }

      if (isEspnPlus) {
        const {data} = await axios.get(scenarioUrl, {
          headers: {
            Accept: 'application/vnd.media-service+json; version=2',
            Authorization: this.account_token.access_token,
            Origin: 'https://plus.espn.com',
            'User-Agent': userAgent,
          },
        });

        uri = data.stream.slide ? data.stream.slide : data.stream.complete;
        headers = {
          Authorization: this.account_token.access_token,
        };
      }

      return [uri, headers];
    } catch (e) {
      // console.error(e);
      console.log('Could not get stream data. Event might be upcoming, ended, or in blackout...');
    }
  };

  public refreshAuth = async (): Promise<void> => {
    try {
      await this.load();
    } catch (e) {
      console.error(e);
      console.log('Could not get auth refresh token (ESPN+)');
    }
  };

  private getGraphQlApiKey = async () => {
    if (!this.graphQlApiKey) {
      try {
        const {data: espnKeys} = await axios.get(
          'https://a.espncdn.com/connected-devices/app-configurations/espn-js-sdk-web-2.0.config.json',
        );
        this.graphQlApiKey = espnKeys.graphqlapi.apiKey;
      } catch (e) {
        console.error(e);
        console.log('Could not get GraphQL API key');
      }
    }
  };

  private getAppConfig = async () => {
    try {
      const {data} = await axios.get<IAppConfig>(BAM_APP_CONFIG);
      this.appConfig = data;
    } catch (e) {
      console.error(e);
      console.log('Could not load API app config');
    }
  };

  private load = async (): Promise<void> => {
    const {
      result: {data},
    } = await iptv.getProvider('espnplus');

    const {
      tokens,
      device_grant,
      device_token_exchange,
      device_refresh_token,
      id_token_grant,
      account_token,
      device_token_exchange_expires,
      device_refresh_token_expires,
      account_token_expires,
    } = data;

    this.tokens = tokens;
    this.device_grant = device_grant;
    this.device_token_exchange = device_token_exchange;
    this.device_refresh_token = device_refresh_token;
    this.id_token_grant = id_token_grant;
    this.account_token = account_token;
    this.device_token_exchange_expires = device_token_exchange_expires;
    this.device_refresh_token_expires = device_refresh_token_expires;
    this.account_token_expires = account_token_expires;

    const {result: linearTokens} = await iptv.getProvider('espn');
    const {adobe_device_id, adobe_auth} = linearTokens;
    this.adobe_device_id = adobe_device_id;
    this.adobe_auth = adobe_auth;
  };
}

export type TESPNPlusTokens = Omit<ClassTypeWithoutMethods<EspnHandler>, 'adobe_device_id' | 'adobe_auth'>;
export type TESPNTokens = Pick<ClassTypeWithoutMethods<EspnHandler>, 'adobe_device_id' | 'adobe_auth'>;

export const espnHandler = new EspnHandler();
