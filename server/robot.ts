// Локальний запуск робота: npm run fon
// У проді це саме робить cron у GitHub Actions (див. .github/workflows/fon.yml).

import { createClient } from "@supabase/supabase-js";
import { zrobytyZvedennya } from "./fon.ts";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_KEY ?? process.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  console.error("Немає SUPABASE_URL / SUPABASE_KEY у server/.env");
  process.exit(1);
}

const db = createClient(url, key);

console.log("Запуск фонової задачі: нічне зведення…");
const skilky = await zrobytyZvedennya(db);
console.log(`Готово: зведення зроблено для ${skilky} майстра(-ів).`);
