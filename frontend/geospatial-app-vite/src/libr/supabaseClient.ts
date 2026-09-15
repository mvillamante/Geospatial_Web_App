import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase backend client configuration
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or key is missing in environment variables");
} 

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseKey
);
