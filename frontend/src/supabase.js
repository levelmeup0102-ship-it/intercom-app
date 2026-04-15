import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nwyxfnezzgfpuypnfnff.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eXhmbmV6emdmcHV5cG5mbmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDA3NTYsImV4cCI6MjA5MTgxNjc1Nn0.BfiLRTKKUMp3IFe7ShezEoXmCREJdIRyc4a39dyObag'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
