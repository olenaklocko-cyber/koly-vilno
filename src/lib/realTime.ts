// Тиждень 4: реальний час.
// Підписка на зміни таблиць: коли база міняється (слот звільнився,
// додався новий) — відкриті сторінки бачать це самі, без перезавантаження.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PodiyiRealTime = {
  // "INSERT" — з'явився, "UPDATE" — змінився, "DELETE" — зник
  typ: "INSERT" | "UPDATE" | "DELETE";
  tabela: string;
  ridky: Record<string, unknown> | null;
};

export type Prymysynyty = (podiya: PodiyiRealTime) => void;

// Підписуємося на «прямий ефір» таблиць. Повертає функцію відписки.
export function pryemyatyZminy(
  db: SupabaseClient,
  tabli: string[],
  naPodiyu: Prymysynyty,
): () => void {
  const kanal = db
    .channel("sloty-zminy")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: tabli[0] },
      (payload) => naPodiyu(perebuty(payload, tabli[0])),
    )
    .subscribe();

  // Якщо таблиць більше — підписуємось на кожну окремим .on()
  for (const t of tabli.slice(1)) {
    kanal.on(
      "postgres_changes",
      { event: "*", schema: "public", table: t },
      (payload) => naPodiyu(perebuty(payload, t)),
    );
  }

  return () => {
    db.removeChannel(kanal);
  };
}

function perebuty(
  payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> },
  tabela: string,
): PodiyiRealTime {
  const ridky =
    payload.eventType === "DELETE" ? payload.old : payload.new;
  return {
    typ: payload.eventType as PodiyiRealTime["typ"],
    tabela,
    ridky: ridky && Object.keys(ridky).length > 0 ? ridky : null,
  };
}
