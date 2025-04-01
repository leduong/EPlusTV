import {Hono} from 'hono';

import {cbs} from './cbs-sports';
import {mw} from './mw';
import {wsn} from './wsn';
import {nsic} from './nsic';
import {paramount} from './paramount';
import {flosports} from './flosports';
import {mlbtv} from './mlb';
import {fox} from './fox';
import {nesn} from './nesn';
import {b1g} from './b1g';
import {nfl} from './nfl';
import {espn} from './espn';
import {espnplus} from './espn-plus';
import {gotham} from './gotham';
import {pwhl} from './pwhl';
import {lovb} from './lovb';
import {bally} from './bally';
import {nwsl} from './nwsl';
import {nhl} from './nhl-tv';
import {victory} from './victory';
import {kbo} from './kbo';

export const providers = new Hono().basePath('/providers');

providers.route('/', cbs);
providers.route('/', nhl);
providers.route('/', mw);
providers.route('/', wsn);
providers.route('/', pwhl);
providers.route('/', lovb);
providers.route('/', bally);
providers.route('/', nwsl);
providers.route('/', nsic);
providers.route('/', paramount);
providers.route('/', flosports);
providers.route('/', mlbtv);
providers.route('/', victory);
providers.route('/', fox);
providers.route('/', nesn);
providers.route('/', b1g);
providers.route('/', nfl);
providers.route('/', espn);
providers.route('/', espnplus);
providers.route('/', gotham);
providers.route('/', kbo);
