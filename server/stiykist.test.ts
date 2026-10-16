import { describe, it, expect } from "vitest";
import {
  zObchekuvannyam,
  zPovtoramy,
  Obmezhuvach,
  stiykyyVyklyk,
} from "./stiykist.ts";

describe("Стійкість до збоїв (тиждень 6)", () => {
  it("таймаут: довгий запит здається, а не вічно чекає", async () => {
    const povilnyi = () =>
      new Promise<string>((r) => setTimeout(() => r("пізно"), 100));
    await expect(zObchekuvannyam(povilnyi, 20)).rejects.toThrow("Таймаут");
  });

  it("таймаут: швидкий запит проходить нормально", async () => {
    const shvydkyi = () => Promise.resolve("ок");
    expect(await zObchekuvannyam(shvydkyi, 100)).toBe("ок");
  });

  it("retry: падає двічі — проходить із третьої спроби", async () => {
    let sprob = 0;
    const nychnyi = async () => {
      sprob++;
      if (sprob < 3) throw new Error("мережа зникла");
      return "нарешті";
    };
    expect(await zPovtoramy(nychnyi, 3, 1)).toBe("нарешті");
    expect(sprob).toBe(3);
  });

  it("retry: якщо все падає — кидає останню помилку", async () => {
    const zavzhdyPadaye = async () => {
      throw new Error("сервіс мертвий");
    };
    await expect(zPovtoramy(zavzhdyPadaye, 2, 1)).rejects.toThrow("сервіс мертвий");
  });

  it("rate limit: 3 за хвилину — 4-й отримує false", () => {
    const obm = new Obmezhuvach(3, 60_000);
    expect(obm.dozvoleno()).toBe(true);
    expect(obm.dozvoleno()).toBe(true);
    expect(obm.dozvoleno()).toBe(true);
    expect(obm.dozvoleno()).toBe(false);
  });

  it("rate limit: лічильник «старіє» (вікно 50 мс)", async () => {
    const obm = new Obmezhuvach(1, 50);
    expect(obm.dozvoleno()).toBe(true);
    expect(obm.dozvoleno()).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(obm.dozvoleno()).toBe(true); // вікно минуло — знову можна
  });

  it("graceful degradation: сервіс мертвий → запасний варіант, не помилка", async () => {
    const mertvyi = async () => {
      throw new Error("502 Bad Gateway");
    };
    const rezultat = await stiykyyVyklyk(mertvyi, {
      zapasnyi: ["запасний слот 1", "запасний слот 2"],
      skilkyPovtoriv: 1,
      pauzaMs: 1,
      timeoutMs: 50,
    });
    expect(rezultat).toEqual(["запасний слот 1", "запасний слот 2"]);
  });

  it("rate limit у stiykyyVyklyk: перевищили — взагалі не ліземо в сервіс", async () => {
    const obm = new Obmezhuvach(1, 60_000);
    let viklyky = 0;
    const rahunok = async () => {
      viklyky++;
      return "мертво";
    };
    await stiykyyVyklyk(rahunok, { zapasnyi: "запасне", skilkyPovtoriv: 0, pauzaMs: 1 }, obm);
    await stiykyyVyklyk(rahunok, { zapasnyi: "запасне", skilkyPovtoriv: 0, pauzaMs: 1 }, obm);
    expect(viklyky).toBe(1); // другий раз — уже ні, ліміт
  });

  it("успішний шлях: stiykyyVyklyk повертає справжні дані", async () => {
    const ok = async () => ({ tsina: 42 });
    const r = await stiykyyVyklyk(ok, { zapasnyi: { tsina: 0 } });
    expect(r).toEqual({ tsina: 42 });
  });
});
