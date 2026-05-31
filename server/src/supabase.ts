import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

/**
 * Server-side Supabase client using the service-role key. This bypasses Row
 * Level Security, so it must NEVER be exposed to the browser. All public access
 * is mediated through our Express API, which anonymises bid data.
 */
export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export const ITEMS_TABLE = 'items';
export const BIDS_TABLE = 'bids';
