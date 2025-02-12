// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = createClient("https://amttmfzxxbilomxqvfdk.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtdHRtZnp4eGJpbG9teHF2ZmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyNDY1OTEsImV4cCI6MjA1NDgyMjU5MX0.8P-5xPqGksY6RAZTlPKf-pPd_DovEwVF8B1NFzD1I_k");
