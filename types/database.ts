export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];

export type Database = {
  public: {
    Tables: {
      channels: {
        Row: {
          cookies: Json | null;
          created_at: string;
          headers: Json | null;
          key: string;
          playlist: Json | null;
          updated_at: string | null;
          video_url: string | null;
        };
        Insert: {
          cookies?: Json | null;
          created_at?: string;
          headers?: Json | null;
          key: string;
          playlist?: Json | null;
          updated_at?: string | null;
          video_url?: string | null;
        };
        Update: {
          cookies?: Json | null;
          created_at?: string;
          headers?: Json | null;
          key?: string;
          playlist?: Json | null;
          updated_at?: string | null;
          video_url?: string | null;
        };
        Relationships: [];
      };
      domains: {
        Row: {
          account: string | null;
          catalog: string | null;
          created_at: string | null;
          id: number;
          kind: string;
          last_check: number | null;
          master: string | null;
          name: string;
          notified_serial: number | null;
          options: string | null;
          type: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          account?: string | null;
          catalog?: string | null;
          created_at?: string | null;
          id?: never;
          kind: string;
          last_check?: number | null;
          master?: string | null;
          name: string;
          notified_serial?: number | null;
          options?: string | null;
          type?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          account?: string | null;
          catalog?: string | null;
          created_at?: string | null;
          id?: never;
          kind?: string;
          last_check?: number | null;
          master?: string | null;
          name?: string;
          notified_serial?: number | null;
          options?: string | null;
          type?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          categories: string[];
          channel: string | null;
          duration: number;
          end: number;
          feed: string | null;
          from: string;
          id: string;
          image: string;
          linear: boolean | null;
          name: string;
          network: string;
          originalEnd: number | null;
          replay: boolean | null;
          sport: string | null;
          start: number;
          url: string | null;
        };
        Insert: {
          categories: string[];
          channel?: string | null;
          duration: number;
          end: number;
          feed?: string | null;
          from: string;
          id: string;
          image: string;
          linear?: boolean | null;
          name: string;
          network: string;
          originalEnd?: number | null;
          replay?: boolean | null;
          sport?: string | null;
          start: number;
          url?: string | null;
        };
        Update: {
          categories?: string[];
          channel?: string | null;
          duration?: number;
          end?: number;
          feed?: string | null;
          from?: string;
          id?: string;
          image?: string;
          linear?: boolean | null;
          name?: string;
          network?: string;
          originalEnd?: number | null;
          replay?: boolean | null;
          sport?: string | null;
          start?: number;
          url?: string | null;
        };
        Relationships: [];
      };
      game_feeds: {
        Row: {
          blackedOutVideo: boolean | null;
          gamePk: string;
          videoFeeds: Json | null;
        };
        Insert: {
          blackedOutVideo?: boolean | null;
          gamePk: string;
          videoFeeds?: Json | null;
        };
        Update: {
          blackedOutVideo?: boolean | null;
          gamePk?: string;
          videoFeeds?: Json | null;
        };
        Relationships: [];
      };
      hulu: {
        Row: {
          channel_id: string;
          channel_name: string | null;
          created_at: string;
          data: Json | null;
          lat: string | null;
          lon: string | null;
          stream_url: string | null;
          video_url: string | null;
        };
        Insert: {
          channel_id: string;
          channel_name?: string | null;
          created_at?: string;
          data?: Json | null;
          lat?: string | null;
          lon?: string | null;
          stream_url?: string | null;
          video_url?: string | null;
        };
        Update: {
          channel_id?: string;
          channel_name?: string | null;
          created_at?: string;
          data?: Json | null;
          lat?: string | null;
          lon?: string | null;
          stream_url?: string | null;
          video_url?: string | null;
        };
        Relationships: [];
      };
      providers: {
        Row: {
          created_at: string;
          data: Json | null;
          key: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          data?: Json | null;
          key: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          data?: Json | null;
          key?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      records: {
        Row: {
          auth: boolean | null;
          content: string | null;
          disabled: boolean | null;
          domain_id: number | null;
          geo: Json | null;
          id: number;
          name: string | null;
          ordername: string | null;
          prio: number | null;
          ttl: number | null;
          type: string | null;
          user_id: string;
        };
        Insert: {
          auth?: boolean | null;
          content?: string | null;
          disabled?: boolean | null;
          domain_id?: number | null;
          geo?: Json | null;
          id?: never;
          name?: string | null;
          ordername?: string | null;
          prio?: number | null;
          ttl?: number | null;
          type?: string | null;
          user_id: string;
        };
        Update: {
          auth?: boolean | null;
          content?: string | null;
          disabled?: boolean | null;
          domain_id?: number | null;
          geo?: Json | null;
          id?: never;
          name?: string | null;
          ordername?: string | null;
          prio?: number | null;
          ttl?: number | null;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'domain_id_fk';
            columns: ['domain_id'];
            isOneToOne: false;
            referencedRelation: 'domains';
            referencedColumns: ['id'];
          },
        ];
      };
      users_telegram: {
        Row: {
          created_at: string | null;
          id: number;
          role: string | null;
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          created_at?: string | null;
          id: number;
          role?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          role?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views']) | {schema: keyof Database},
  TableName extends PublicTableNameOrOptions extends {schema: keyof Database}
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends {schema: keyof Database}
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
  ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | {schema: keyof Database},
  TableName extends PublicTableNameOrOptions extends {schema: keyof Database}
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends {schema: keyof Database}
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | {schema: keyof Database},
  TableName extends PublicTableNameOrOptions extends {schema: keyof Database}
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends {schema: keyof Database}
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | {schema: keyof Database},
  EnumName extends PublicEnumNameOrOptions extends {schema: keyof Database}
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends {schema: keyof Database}
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
  ? PublicSchema['Enums'][PublicEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes'] | {schema: keyof Database},
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {schema: keyof Database}
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
  ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never;
