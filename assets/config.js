/* Supabase connection. Both values are PUBLIC by design (they ship to every browser);
   access is locked down by the Row Level Security policies in supabase/schema.sql.
   Find them in: Supabase Dashboard > Project Settings > API (Project URL + anon / publishable key).
   NEVER put the service_role / secret key here. */
window.RATELY = {
  SUPABASE_URL: 'https://qedyanhjrkzjwqfihbvm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZHlhbmhqcmt6andxZmloYnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzQ2MjAsImV4cCI6MjEwNzA1MDYyMH0.JJJIMJRQDdCR_ujWoRVsx477lRwfWd61Q9gkZ8rXV3M'
};
