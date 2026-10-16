import { createClient } from "@supabase/supabase-js";

// Клієнт Supabase у браузері. Адреса та ключ — з .env (не в коді!).
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
);

export default supabase;
