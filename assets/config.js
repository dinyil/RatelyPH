/* Supabase connection. Both values are PUBLIC by design (they ship to every browser);
   access is locked down by the Row Level Security policies in supabase/schema.sql.
   Find them in: Supabase Dashboard > Project Settings > API (Project URL + anon / publishable key).
   NEVER put the service_role / secret key here. */
window.RATELY = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-OR-PUBLISHABLE-KEY'
};
