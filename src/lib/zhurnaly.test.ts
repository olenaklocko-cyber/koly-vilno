import { describe, it, expect, vi, beforeEach } from "vitest";

type ZapisInsert = {
  typ: string;
  povitomlennya: string;
  detal: string | null;
  storinka: string | null;
};

const vstavka = vi.fn(async (_zapis: ZapisInsert): Promise<{ error: null }> => ({ error: null }));
vi.mock("./supabase", () => ({
  default: { from: () => ({ insert: (z: ZapisInsert) => vstavka(z) }) },
}));

import { zapysatyPodiyu } from "./zhurnaly.ts";

function ostanniyZapis(): ZapisInsert {
  const calls = vstavka.mock.calls as unknown as ZapisInsert[][];
  return calls[calls.length - 1][0];
}

describe("Логи (тиждень 5)", () => {
  beforeEach(() => {
    vstavka.mockClear();
  });

  it("записує помилку в базу", async () => {
    await zapysatyPodiyu({
      typ: "pomylka",
      povitomlennya: "Сторінка впала",
      detal: "App.tsx:10",
    });
    expect(vstavka).toHaveBeenCalledTimes(1);
    const zapis = ostanniyZapis();
    expect(zapis.typ).toBe("pomylka");
    expect(zapis.povitomlennya).toBe("Сторінка впала");
  });

  it("обрізає довге повідомлення (500 символів)", async () => {
    await zapysatyPodiyu({
      typ: "pomylka",
      povitomlennya: "х".repeat(800),
    });
    expect(ostanniyZapis().povitomlennya.length).toBe(500);
  });

  it("не пише деталей, якщо їх немає", async () => {
    await zapysatyPodiyu({ typ: "podiya", povitomlennya: "Відкрив сторінку" });
    expect(ostanniyZapis().detal).toBeNull();
  });

  it("ніколи не кидає виключення, якщо база впала (лог не ламає застосунок)", async () => {
    vstavka.mockRejectedValueOnce(new Error("мережа зникла"));
    await expect(
      zapysatyPodiyu({ typ: "pomylka", povitomlennya: "тест" }),
    ).resolves.toBeUndefined();
  });
});
