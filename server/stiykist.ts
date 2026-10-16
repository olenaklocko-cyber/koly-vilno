// Тиждень 6: стійкість до збоїв.
// Чотири прийоми в одному місці:
// 1) TIMEOUT — не чекаємо вічно, здаємось через N мс;
// 2) RETRY — повторюємо запит (мережа блиснула — ще раз);
// 3) RATE LIMIT — не більше N запитів за хвилину від однієї «руки»;
// 4) GRACEFUL DEGRADATION — якщо все зламалося, показуємо запасний варіант,
//    а не білий екран і не помилку.

export type OptytsiiStiykosti<T> = {
  timeoutMs?: number; // за замовчуванням 3 с
  skilkyPovtoriv?: number; // за замовчуванням 2 (тобто до 3 спроб)
  pauzaMs?: number; // пауза між спробами (за замовчуванням 200 мс)
  zapasnyi: T; // що показати, якщо все зламалося
};

// «Не чекати вічно»: якщо запит довше timeoutMs — кидаємо помилку.
export async function zObchekuvannyam<T>(
  f: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let taymer: ReturnType<typeof setTimeout> | undefined;
  const taymaut = new Promise<never>((_, reject) => {
    taymer = setTimeout(
      () => reject(new Error(`Таймаут: запит довше ${timeoutMs} мс`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([f(), taymaut]);
  } finally {
    clearTimeout(taymer);
  }
}

// «Мережа блиснула — ще раз»: повторюємо до skilkyPovtoriv разів.
export async function zPovtoramy<T>(
  f: () => Promise<T>,
  skilkyPovtoriv: number,
  pauzaMs: number,
): Promise<T> {
  let ostannyaPomylka: Error = new Error("Невідома помилка");
  for (let sproba = 0; sproba <= skilkyPovtoriv; sproba++) {
    try {
      return await f();
    } catch (e) {
      ostannyaPomylka = e as Error;
      if (sproba < skilkyPovtoriv) {
        await new Promise((r) => setTimeout(r, pauzaMs * (sproba + 1)));
      }
    }
  }
  throw ostannyaPomylka;
}

// «Не більше N за хвилину»: простий лічильник у пам'яті.
export class Obmezhuvach {
  private chasy: number[] = [];

  constructor(
    private maksymum: number,
    private viknoMs: number,
  ) {}

  // Повертає true, якщо запит дозволено; false — перевищили ліміт.
  dozvoleno(): boolean {
    const zaраз = Date.now();
    this.chasy = this.chasy.filter((t) => zaраз - t < this.viknoMs);
    if (this.chasy.length >= this.maksymum) return false;
    this.chasy.push(zaраз);
    return true;
  }

  skilkyZalyshylosya(): number {
    return Math.max(0, this.maksymum - this.chasy.length);
  }
}

// Все разом: ліміт → таймаут → повтори → запасний варіант.
export async function stiykyyVyklyk<T>(
  f: () => Promise<T>,
  optytsii: OptytsiiStiykosti<T>,
  obmezhuvach?: Obmezhuvach,
): Promise<T> {
  if (obmezhuvach && !obmezhuvach.dozvoleno()) {
    return optytsii.zapasnyi; // ліміт — тихо показуємо запасне, не чекаємо
  }
  try {
    return await zPovtoramy(
      () => zObchekuvannyam(f, optytsii.timeoutMs ?? 3000),
      optytsii.skilkyPovtoriv ?? 2,
      optytsii.pauzaMs ?? 200,
    );
  } catch {
    return optytsii.zapasnyi; // graceful degradation
  }
}
