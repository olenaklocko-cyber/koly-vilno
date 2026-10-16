// Тиждень 8 (капстоун): панель здоров'я.
// Відповідає на питання: «чи живий зараз, і як швидко працює?»
// Оновлюється сама кожні 10 секунд.

import { useCallback, useEffect, useState } from "react";
import supabase from "../lib/supabase";

type StanZdorovya = {
  bazhanyiMS: number;
  faktachnyiMS: number | null;
  slukhae: boolean;
  pomylka: string | null;
  kilkistSlotiv: number | null;
  kilkistPodiy: number | null;
  ostannyaPerevirka: string | null;
};

const NORMA_MS = 500; // якщо швидше за 500 мс — все добре

function kolirStanu(ms: number | null, slukhae: boolean): { kolir: string; teks: string } {
  if (!slukhae) return { kolir: "#dc2626", teks: "❌ НЕ ПРАЦЮЄ" };
  if (ms === null) return { kolir: "#94a3b8", teks: "⏳ перевіряємо…" };
  if (ms <= NORMA_MS) return { kolir: "#16a34a", teks: "✅ ВІДМІННО" };
  if (ms <= 2000) return { kolir: "#f59e0b", teks: "⚠️ ПОВІЛЬНО" };
  return { kolir: "#dc2626", teks: "❌ ДУЖЕ ПОВІЛЬНО" };
}

export default function PanelZdorovya() {
  const [stan, setStan] = useState<StanZdorovya>({
    bazhanyiMS: NORMA_MS,
    faktachnyiMS: null,
    slukhae: false,
    pomylka: null,
    kilkistSlotiv: null,
    kilkistPodiy: null,
    ostannyaPerevirka: null,
  });
  const [avtoperevirka, setAvtoperevirka] = useState(true);

  const pereviryty = useCallback(async () => {
    const pochatok = performance.now();
    try {
      // 1. Пінг бази: мінімальний запит
      const { data: sloty, error: e1 } = await supabase
        .from("sloty")
        .select("id", { count: "exact", head: true });
      const ms1 = performance.now() - pochatok;

      if (e1) throw new Error(e1.message);

      // 2. Логи (може бути порожньо для не-власника — це нормально)
      const { count: kilkistPodiy } = await supabase
        .from("podiyi")
        .select("id", { count: "exact", head: true });

      setStan({
        bazhanyiMS: NORMA_MS,
        faktachnyiMS: Math.round(ms1),
        slukhae: true,
        pomylka: null,
        kilkistSlotiv: sloty === null ? null : (sloty as unknown as number) ?? 0,
        kilkistPodiy: kilkistPodiy,
        ostannyaPerevirka: new Date().toLocaleTimeString("uk-UA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
    } catch (e) {
      setStan((s) => ({
        ...s,
        faktachnyiMS: Math.round(performance.now() - pochatok),
        slukhae: false,
        pomylka: (e as Error).message,
        ostannyaPerevirka: new Date().toLocaleTimeString("uk-UA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }));
    }
  }, []);

  // Перевірка при завантаженні + кожні 10 с
  useEffect(() => {
    void pereviryty();
    if (!avtoperevirka) return;
    const m = setInterval(() => void pereviryty(), 10_000);
    return () => clearInterval(m);
  }, [pereviryty, avtoperevirka]);

  const { kolir, teks } = kolirStanu(stan.faktachnyiMS, stan.slukhae);

  return (
    <div className="konteyner">
      <header className="shapka">
        <h1>🩺 Здоров'я системи</h1>
        <a href="/" className="knopka" style={{ fontSize: 13, padding: "8px 12px" }}>
          ← Назад
        </a>
      </header>

      {/* Головний статус */}
      <section className="kartka" style={{ borderColor: kolir, borderWidth: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: kolir,
              boxShadow: `0 0 12px ${kolir}`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kolir }}>{teks}</div>
            <div style={{ fontSize: 13, color: "#78716c" }}>
              {stan.ostannyaPerevirka
                ? `Остання перевірка: ${stan.ostannyaPerevirka}`
                : "Перевіряємо…"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stan.faktachnyiMS ?? "—"} мс</div>
            <div style={{ fontSize: 12, color: "#78716c" }}>час відповіді бази</div>
          </div>
        </div>
        {stan.pomylka && (
          <p className="pomylka" style={{ marginTop: 12, marginBottom: 0 }}>
            {stan.pomylka}
          </p>
        )}
      </section>

      {/* Метрики */}
      <section className="kartka">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Метрики</h2>
        <div className="slots">
          <div className="slot">
            <b style={{ fontSize: 22 }}>{stan.kilkistSlotiv ?? "—"}</b>
            <div style={{ fontSize: 13, color: "#78716c" }}>слотів у базі</div>
          </div>
          <div className="slot">
            <b style={{ fontSize: 22 }}>{stan.kilkistPodiy ?? "—"}</b>
            <div style={{ fontSize: 13, color: "#78716c" }}>логів (подій)</div>
          </div>
          <div className="slot">
            <b style={{ fontSize: 22 }}>{stan.bazhanyiMS} мс</b>
            <div style={{ fontSize: 13, color: "#78716c" }}>ціль швидкості</div>
          </div>
          <div className="slot">
            <b style={{ fontSize: 22 }}>
              {stan.faktachnyiMS !== null && stan.faktachnyiMS <= stan.bazhanyiMS ? "✓" : "✗"}
            </b>
            <div style={{ fontSize: 13, color: "#78716c" }}>вкладаємось у ціль</div>
          </div>
        </div>
      </section>

      {/* Керування */}
      <section className="kartka">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Керування</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="knopka" onClick={() => void pereviryty()}>
            🔁 Перевірити зараз
          </button>
          <button
            className="knopka"
            style={{
              background: avtoperevirka ? "#0d9488" : "#78716c",
            }}
            onClick={() => setAvtoperevirka((v) => !v)}
          >
            {avtoperevirka ? "⏸ Пауза автоперевірки" : "▶ Увімкнути автоперевірку"}
          </button>
        </div>
        <p className="pustyi" style={{ marginBottom: 0, fontSize: 13 }}>
          Автоперевірка оновлює статус кожні 10 секунд. Якщо база «лежить» —
          червоний статус + причина. Сторінка працює навіть коли база недоступна.
        </p>
      </section>

      {/* Легенда */}
      <section className="kartka" style={{ fontSize: 13, color: "#78716c" }}>
        <b>Як читати:</b> зелений — база відповідає швидше за {NORMA_MS} мс;
        жовтий — повільно, але працює; червоний — недоступна або дуже повільна.
        Час вимірюється від запиту до відповіді (реальний пінг).
      </section>
    </div>
  );
}
