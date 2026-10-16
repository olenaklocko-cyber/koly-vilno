// Бенчмарк «було/стало»: скільки мілісекунд віддає запит до Supabase.
// Запуск: npm run bench
// Потрібні у server/.env: SUPABASE_URL, SUPABASE_KEY (anon або service)

import { klientZSupabase, vilitniSlotyBezKeshu, vilitniSlotyZKeshem, ochystytyKeshSlotiv } from "./sloty";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_KEY ?? process.env.VITE_SUPABASE_KEY;
const maysterId = Number(process.env.MAYSTER_ID ?? "1");

if (!url || !key) {
  console.error("Немає SUPABASE_URL / SUPABASE_KEY у server/.env");
  process.exit(1);
}

const db = klientZSupabase(url, key);

async function zameraty(nazva: string, f: () => Promise<unknown>, raziv = 5): Promise<number> {
  const chasy: number[] = [];
  for (let i = 0; i < raziv; i++) {
    const pochatok = performance.now();
    await f();
    chasy.push(performance.now() - pochatok);
  }
  const seredne = chasy.reduce((a, b) => a + b, 0) / chasy.length;
  const naykilkyshyye = Math.max(...chasy);
  console.log(
    `${nazva}: середнє ${seredne.toFixed(1)} мс · найповільніший прогін ${naykilkyshyye.toFixed(1)} мс (${raziv} прогонів)`,
  );
  return seredne;
}

console.log(`Майстер №${maysterId}\n`);

console.log("1) Без кешу (БУЛО) — запит щоразу йде в базу:");
const bezKeshu = await zameraty("  вільні слоти", () => vilitniSlotyBezKeshu(db, maysterId));

console.log("\n2) З кешем (СТАЛО) — перший прогін у базу, далі з пам'яті:");
ochystytyKeshSlotiv();
const pershyi = await zameraty("  перший виклик (холодний кеш)", () => vilitniSlotyZKeshem(db, maysterId), 1);
const keshovanyi = await zameraty("  з кеша (гарячий)", () => vilitniSlotyZKeshem(db, maysterId));

const pryskorenya = keshovanyi > 0 ? (bezKeshu / keshovanyi).toFixed(1) : "—";
console.log(
  `\nПІДСУМОК: було ${bezKeshu.toFixed(1)} мс → стало ${keshovanyi.toFixed(1)} мс (${pryskorenya}× швидше)`,
);
console.log(`Холодний старт: ${pershyi.toFixed(1)} мс (запит у базу, як і раніше)`);
