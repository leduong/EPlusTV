import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {Database} from '../types/database';
import {IEntry} from './shared-interfaces';

interface Provider {
  key: string;
  data?: any;
}

class SupabaseService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not defined in environment variables.');
    }
    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_KEY is not defined in environment variables.');
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Provider methods

  async getProvider(key: string): Promise<{error: any; result: any}> {
    const {data: result, error} = await this.supabase.from('providers').select('*').eq('key', key).single();
    if (error) {
      console.error('Error fetching provider:', error);
    }
    return {error, result};
  }

  async upsertProvider(provider: Provider): Promise<{error: any; result: any}> {
    const {key, data} = provider;
    const {data: result, error} = await this.supabase.from('providers').upsert({data, key}).select();
    if (error) {
      console.error('Error upserting provider:', error);
    }
    return {error, result};
  }

  // Entry methods

  async getEntries(channel: string): Promise<{error: any; result: any}> {
    const {data: result, error} = await this.supabase
      .from('entries')
      .select('*')
      .eq('from', channel)
      .order('start', {ascending: true});
    if (error) {
      console.error('Error fetching entries:', error);
    }
    return {error, result};
  }

  async getEntry(id: string): Promise<{error: any; result: any}> {
    const {data: result, error} = await this.supabase.from('entries').select('*').eq('id', id).single();
    if (error) {
      console.error('Error fetching entry:', error);
    }
    return {error, result};
  }

  async upsertEntries(entries: IEntry[]): Promise<{error: any; result: any}> {
    // Chuyển đổi trường channel sang string (hoặc null) cho từng entry
    const entriesToUpsert = entries.map(entry => ({
      ...entry,
      channel: entry.channel != null ? String(entry.channel) : null,
    }));

    const {data: result, error} = await this.supabase.from('entries').upsert(entriesToUpsert).select();
    if (error) {
      console.error('Error upserting entries:', error);
    }
    return {error, result};
  }
}

export const iptv = new SupabaseService();
