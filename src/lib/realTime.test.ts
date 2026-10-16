import { describe, it, expect, vi, beforeEach } from "vitest";
import { pryemyatyZminy, type PodiyiRealTime } from "./realTime.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// Мок каналу Supabase: ловимо обробники, щоб «надіслати» подію вручну
let obrobnyky: Array<{ tabela: string; f: (p: unknown) => void }> = [];
let vydaleno = 0;

function fiktyvnyiDb(): SupabaseClient {
  obrobnyky = [];
  vydaleno = 0;
  const kanal = {
    on(_typ: string, cfg: { table: string }, f: (p: unknown) => void) {
      obrobnyky.push({ tabela: cfg.table, f });
      return kanal;
    },
    subscribe: () => kanal,
  };
  return {
    channel: () => kanal,
    removeChannel: () => {
      vydaleno++;
    },
  } as unknown as SupabaseClient;
}

describe("Реальний час (тиждень 4)", () => {
  beforeEach(() => {
    fiktyvnyiDb();
  });

  it("підписується на вказані таблиці", () => {
    pryemyatyZminy(fiktyvnyiDb(), ["sloty", "bronuvannya"], () => {});
    const tabli = obrobnyky.map((o) => o.tabela);
    expect(tabli).toContain("sloty");
    expect(tabli).toContain("bronuvannya");
  });

  it("подія INSERT доходить з правильною типізацією", () => {
    const podiyi: PodiyiRealTime[] = [];
    pryemyatyZminy(fiktyvnyiDb(), ["sloty"], (p) => podiyi.push(p));
    obrobnyky[0].f({
      eventType: "INSERT",
      new: { id: 5, status: "vilnyi" },
      old: {},
    });
    expect(podiyi).toEqual([
      { typ: "INSERT", tabela: "sloty", ridky: { id: 5, status: "vilnyi" } },
    ]);
  });

  it("подія DELETE бере старі дані (id зниклого рядка)", () => {
    const podiyi: PodiyiRealTime[] = [];
    pryemyatyZminy(fiktyvnyiDb(), ["sloty"], (p) => podiyi.push(p));
    obrobnyky[0].f({
      eventType: "DELETE",
      new: {},
      old: { id: 7 },
    });
    expect(podiyi[0].typ).toBe("DELETE");
    expect(podiyi[0].ridky).toEqual({ id: 7 });
  });

  it("відписка прибирає канал", () => {
    const db = fiktyvnyiDb();
    const vidpysatysya = pryemyatyZminy(db, ["sloty"], () => {});
    vidpysatysya();
    expect(vydaleno).toBe(1);
  });

  it("порожній payload → ridky: null (не ламає UI)", () => {
    const podiyi: PodiyiRealTime[] = [];
    pryemyatyZminy(fiktyvnyiDb(), ["sloty"], (p) => podiyi.push(p));
    obrobnyky[0].f({ eventType: "UPDATE", new: {}, old: {} });
    expect(podiyi[0].ridky).toBeNull();
  });

  it("не викликає on-и на порожньому списку таблиць (порожній аргумент)", () => {
    const spy = vi.fn();
    pryemyatyZminy(fiktyvnyiDb(), ["sloty"], spy);
    expect(obrobnyky.length).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
  });
});
