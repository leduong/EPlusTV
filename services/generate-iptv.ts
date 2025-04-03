import {calculateChannelFromName} from './channels';
import {db} from './database';
import {MLBTeam, mlbTeams} from './mlb-handler';
import {IEntry} from './shared-interfaces';
import moment from 'moment';

function convertToET(date: Date | number | string, format = 'MM/DD HH:mm'): string {
  // Convert the input to a Moment object
  const parsedDate = moment(date);

  if (!parsedDate.isValid()) {
    throw new Error('Invalid datetime value.');
  }

  // Convert to Eastern Time (ET)
  const easternTime = parsedDate.tz('America/New_York');

  // Format the date to "MM/DD HH:mm ET"
  return easternTime.format(format);
}

const formatEntryName = (entry: IEntry) => {
  let entryName = `[${entry.from.toUpperCase()} ${entry.channel}] ${entry.name}`;

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

  const scheduledEntries: any = await db.entries
    .find<IEntry>({
      channel: {$exists: true},
      from: provider ? provider : {$exists: false},
      linear: linear ? true : {$exists: false},
    })
    .sort({start: 1});

  for (const entry of scheduledEntries) {
    const channelNum = await calculateChannelFromName(`${entry.channel}`);
    const entryName = formatEntryName(entry);

    m3uFile = `${m3uFile}\n#EXTINF:0,${entryName} - ${convertToET(entry.start)} - ${convertToET(entry.end)} EST`;
    m3uFile = `${m3uFile}\n${uri}/channels/${channelNum}.m3u8\n`;
  }

  return m3uFile;
};

export const generateM3uTeam = async (
  uri: string,
  team: string,
  linear = false,
  provider = 'mlbtv',
): Promise<string> => {
  let m3uFile = '#EXTM3U';
  const teamName = mlbTeams.find((t: MLBTeam) => t.slug === team)?.name;

  const scheduledEntries: any = await db.entries
    .find<IEntry>({
      channel: {$exists: true},
      from: provider ? provider : {$exists: false},
      linear: linear ? true : {$exists: false},
    })
    .sort({start: 1});

  for (const entry of scheduledEntries) {
    if (entry.categories && entry.categories.includes(teamName)) {
      const channelNum = await calculateChannelFromName(`${entry.channel}`);
      const entryName = formatEntryName(entry);

      m3uFile = `${m3uFile}\n#EXTINF:0,${entryName} - ${convertToET(entry.start)} - ${convertToET(entry.end)} EST`;
      m3uFile = `${m3uFile}\n${uri}/channels/${channelNum}.m3u8\n`;
    }
  }

  return m3uFile;
};

export const generateM3uTeams = async (uri: string): Promise<string> => {
  let m3uFile = '#EXTM3U';

  for (const team of mlbTeams) {
    m3uFile = `${m3uFile}\n#EXTINF:0,${team.name}`;
    m3uFile = `${m3uFile}\n${uri}/team/${team.slug}.m3u\n`;
  }

  return m3uFile;
};

export const generateJson = async (uri: string, linear = false): Promise<any> => {
  const scheduledEntries = await db.entries
    .find<IEntry>({channel: {$exists: true}, linear: linear ? true : {$exists: false}})
    .sort({start: 1});

  return scheduledEntries;
};
