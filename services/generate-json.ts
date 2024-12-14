import {db} from './database';
import {IEntry} from './shared-interfaces';

export const generateJson = async (uri: string, linear = false): Promise<any> => {
  const scheduledEntries = await db.entries
    .find<IEntry>({channel: {$exists: true}, linear: linear ? true : {$exists: false}})
    .sort({start: 1});

  return scheduledEntries;
};
