import {calculateChannelFromName} from './channels';
import {db} from './database';
import {IEntry} from './shared-interfaces';
import moment from 'moment';

function convertToET(date: Date | number | string): string {
  // Convert the input to a Moment object
  const parsedDate = moment(date);

  if (!parsedDate.isValid()) {
    throw new Error('Invalid datetime value.');
  }

  // Convert to Eastern Time (ET)
  const easternTime = parsedDate.tz('America/New_York');

  // Format the date to "MM/DD HH:mm ET"
  return easternTime.format('MM/DD HH:mm') + ' ET';
}

const formatEntryName = (entry: IEntry) => {
  let entryName = `[${entry.from.toUpperCase()} ${entry.channel}] [${entry.categories
    .map(x => x.toLocaleLowerCase())
    .join(', ')}] ${entry.name}`;

  if (entry.feed) {
    entryName = `${entryName} (${entry.feed})`;
  }

  if (entry.sport && !entry.linear) {
    entryName = `${entryName} ${entry.sport}`;
  }

  return entryName;
};

export const generateM3uIptv = async (uri: string, linear = false, provider = ''): Promise<string> => {
  let m3uFile = '#EXTM3U';

  const scheduledEntries = await db.entries
    .find<IEntry>({
      channel: {$exists: true},
      from: provider ? provider : {$exists: false},
      linear: linear ? true : {$exists: false},
    })
    .sort({start: 1});

  for (const entry of scheduledEntries) {
    const channelNum = await calculateChannelFromName(`${entry.channel}`);
    const entryName = formatEntryName(entry);

    m3uFile = `${m3uFile}\n#EXTINF:-1,${entryName} ${convertToET(entry.start)}`;
    m3uFile = `${m3uFile}\n${uri}/channels/${channelNum}.m3u8\n`;
  }

  return m3uFile;
};
