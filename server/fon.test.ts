import { describe, it, expect, vi } from "vitest";
import { zrobytyZvedennya, peremkynutySlot, skasuvatyTaPeredaty } from "./fon.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

function fiktyvnyiDb(opts: {
  rpc?: (nazva: string, args?: Record<string, unknown>) => Promise<unknown>;
  otrymaty?: () => Promise<unknown>;
  onovlyty?: () => Promise<unknown>;
}): SupabaseClient {
  const lanchuzhok = (obitsyana: () => Promise<unknown>) => ({
    eq: () => ({ single: obitsyana }),
  });
  return {
    rpc: opts.rpc ?? vi.fn(),
    from: () => ({
      select: () => lanchuzhok(opts.otrymaty ?? (async () => ({ data: null, error: null }))),
      update: () => lanchuzhok(opts.onovlyty ?? (async () => ({ error: null }))),
    }),
  } as unknown as SupabaseClient;
}

describe("Фонові задачі (тиждень 3)", () => {
  it("зведення повертає кількість майстрів", async () => {
    const db = fiktyvnyiDb({ rpc: async () => ({ data: 3, error: null }) });
    expect(await zrobytyZvedennya(db)).toBe(3);
  });

  it("зведення кидає зрозумілу помилку, якщо база відмовила", async () => {
    const db = fiktyvnyiDb({
      rpc: async () => ({ data: null, error: { message: "denied" } }),
    });
    await expect(zrobytyZvedennya(db)).rejects.toThrow("zrobyty_zvedennya: denied");
  });

  it("просування черги повертає id клієнта", async () => {
    const db = fiktyvnyiDb({
      rpc: async (nazva) => {
        expect(nazva).toBe("peremkynuty_slot");
        return { data: "uuid-клієнта", error: null };
      },
    });
    expect(await peremkynutySlot(db, 10)).toBe("uuid-клієнта");
  });

  it("просування повертає null, якщо черга порожня", async () => {
    const db = fiktyvnyiDb({ rpc: async () => ({ data: null, error: null }) });
    expect(await peremkynutySlot(db, 10)).toBeNull();
  });

  it("скасування: неактивне бронювання не чіпаємо (null, без виклику бази)", async () => {
    const onovlyty = vi.fn(async () => ({ error: null }));
    const db = fiktyvnyiDb({
      otrymaty: async () => ({
        data: { id: 1, slot_id: 5, status: "skasovane" },
        error: null,
      }),
      onovlyty,
    });
    expect(await skasuvatyTaPeredaty(db, 1)).toBeNull();
    expect(onovlyty).not.toHaveBeenCalled();
  });
});
