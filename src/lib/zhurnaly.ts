// Тиждень 5: логи і моніторинг.
// Ловець помилок: ловить те, що «не видно» (помилки в браузері),
// і відправляє в базу. Панель моніторингу показує власнику.
// Правило: у лог НІКОЛИ не пишемо паролі, ключі чи персональні дані.

import supabase from "./supabase";

export type TypPodiyi = "pomylka" | "podiya" | "metryka";

export type ZapisPodiyi = {
  typ: TypPodiyi;
  povitomlennya: string;
  detal?: string;
  storinka?: string;
};

// Один-єдиний вхід для логів. Ніколи не кидає виключення —
// лог не має ламати сам застосунок.
export async function zapysatyPodiyu(zapis: ZapisPodiyi): Promise<void> {
  try {
    const { error } = await supabase.from("podiyi").insert({
      typ: zapis.typ,
      povitomlennya: zapis.povitomlennya.slice(0, 500),
      detal: zapis.detal?.slice(0, 2000) ?? null,
      storinka: zapis.storinka ?? (typeof window !== "undefined" ? window.location.hash : null),
    });
    if (error) console.warn("Не вдалося записати лог:", error.message);
  } catch {
    // тихо — лог не має ламати застосунок
  }
}

// Встановлює глобального ловця помилок браузера (один раз на старті).
export function vstanovytyLovcaPomylok(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (podiya) => {
    void zapysatyPodiyu({
      typ: "pomylka",
      povitomlennya: podiya.message || "Невідома помилка",
      detal: `${podiya.filename ?? ""}:${podiya.lineno ?? 0}`,
    });
  });

  window.addEventListener("unhandledrejection", (podiya) => {
    const prychyna = podiya.reason;
    void zapysatyPodiyu({
      typ: "pomylka",
      povitomlennya:
        prychyna instanceof Error ? prychyna.message : "Необроблений проміс",
      detal: prychyna instanceof Error ? prychyna.stack?.slice(0, 2000) : String(prychyna).slice(0, 2000),
    });
  });
}
