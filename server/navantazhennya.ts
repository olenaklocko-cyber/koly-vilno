// Тиждень 8 (капстоун): навантажувальний тест.
// Симулює 500 користувачів, які одночасно дивляться «вільні слоти».
// Запуск: npm run navantazhennya
// Потрібні у server/.env: SUPABASE_URL, SUPABASE_KEY

import { klientZSupabase, vilitniSlotyBezKeshu, vilitniSlotyZKeshem, ochystytyKeshSlotiv } from "./sloty.ts";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_KEY ?? process.env.VITE_SUPABASE_KEY;
const maysterId = Number(process.env.MAYSTER_ID ?? "1");
const SKILKY = Number(process.env.SKILKY_KORYSTUVACHIV ?? "500");
const PAZYVA_MS = Number(process.env.PAZYVA_MS ?? "0"); // пауза між «користувачами» (0 = разом)

if (!url || !key) {
  console.error("Немає SUPABASE_URL / SUPABASE_KEY у server/.env");
  process.exit(1);
}

const db = klientZSupabase(url, key);

type Rezultat = {
  ms: number;
  pomylka: string | null;
  kilkistSlotiv: number;
};

async function odynKorystuvach(zKeshem: boolean): Promise<Rezultat> {
  const pochatok = performance.now();
  try {
    const data = zKeshem
      ? await vilitniSlotyZKeshem(db, maysterId)
      : await vilitniSlotyBezKeshu(db, maysterId);
    return { ms: performance.now() - pochatok, pomylka: null, kilkistSlotiv: data.length };
  } catch (e) {
    return { ms: performance.now() - pochatok, pomylka: (e as Error).message, kilkistSlotiv: 0 };
  }
}

function percentyl(chasy: number[], p: number): number {
  const vidsortovani = [...chasy].sort((a, b) => a - b);
  const idx = Math.min(Math.floor((p / 100) * vidsortovani.length), vidsortovani.length - 1);
  return vidsortovani[idx] ?? 0;
}

async function runScenario(nazva: string, zKeshem: boolean): Promise<void> {
  ochystytyKeshSlotiv();

  if (PAZYVA_MS > 0) {
    // «Поступовий потік» — кожні PAZYVA_MS мс приходить новий користувач
    const promisy: Promise<Rezultat>[] = [];
    for (let i = 0; i < SKILKY; i++) {
      await new Promise((r) => setTimeout(r, PAZYVA_MS));
      promisy.push(odynKorystuvach(zKeshem));
    }
    const rezultaty = await Promise.all(promisy);
    pidsumok(nazva, rezultaty);
  } else {
    // «Всі разом» — 500 натискань одночасно
    const pochatok = performance.now();
    const rezultaty = await Promise.all(
      Array.from({ length: SKILKY }, () => odynKorystuvach(zKeshem)),
    );
    const vsiMs = performance.now() - pochatok;
    pidsumok(nazva, rezultaty, vsiMs);
  }
}

function pidsumok(nazva: string, r: Rezultat[], vsiMs?: number): void {
  const chasy = r.map((x) => x.ms);
  const pomylky = r.filter((x) => x.pomylka);
  const seredne = chasy.reduce((a, b) => a + b, 0) / chasy.length;

  console.log(`\n📊 ${nazva} (${SKILKY} користувачів${PAZYVA_MS > 0 ? `, потік ${PAZYVA_MS} мс` : ", разом"})`);
  console.log(`   Середній час відповіді: ${seredne.toFixed(1)} мс`);
  console.log(`   P50: ${percentyl(chasy, 50).toFixed(1)} мс · P95: ${percentyl(chasy, 95).toFixed(1)} мс · P99: ${percentyl(chasy, 99).toFixed(1)} мс`);
  console.log(`   Найповільніший: ${Math.max(...chasy).toFixed(1)} мс`);
  console.log(`   Помилки: ${pomylky.length} з ${SKILKY}`);
  if (vsiMs !== undefined) {
    console.log(`   Загальний час (усі разом): ${vsiMs.toFixed(0)} мс`);
    console.log(`   Пропускна здатність: ${(SKILKY / (vsiMs / 1000)).toFixed(0)} запитів/сек`);
  }
  if (pomylky.length > 0) {
    console.log(`   Приклад помилки: ${pomylky[0].pomylka}`);
  }
}

console.log(`🚀 Навантажувальний тест — майстер №${maysterId}\n`);

console.log("1) БЕЗ кешу — кожен іде в базу (якби кешу не було):");
await runScenario("Без кешу", false);

console.log("\n2) З кешем — перший у базу, решта з пам'яті:");
await runScenario("З кешем", true);

console.log("\n✅ Тест завершено.");
