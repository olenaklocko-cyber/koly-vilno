// Тиждень 5: панель моніторингу — «що відбувається всередині».
// Для власника: логи помилок + метрики. Для чужих — «лише для власника».

import { useEffect, useState } from "react";
import supabase from "../lib/supabase";
import type { TypPodiyi } from "../lib/zhurnaly";

type Podiya = {
  id: number;
  typ: TypPodiyi;
  povitomlennya: string;
  detal: string | null;
  storinka: string | null;
  created_at: string;
};

type Metryka = { typ: TypPodiyi; kilkist: number };

const CYFRA_TYPU: Record<TypPodiyi, string> = {
  pomylka: "🔴",
  podiya: "🔵",
  metryka: "🟢",
};

export default function PanelMonitorynhu() {
  const [podiyi, setPodiyi] = useState<Podiya[]>([]);
  const [metryky, setMetryky] = useState<Metryka[]>([]);
  const [stan, setStan] = useState<"завантаження" | "готово" | "не_власник">("завантаження");

  useEffect(() => {
    void (async () => {
      const [zPodiy, zMetryk] = await Promise.all([
        supabase
          .from("podiyi")
          .select("id, typ, povitomlennya, detal, storinka, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("podiyi").select("typ"),
      ]);

      if (zPodiy.error) {
        setStan("не_власник");
        return;
      }
      setPodiyi((zPodiy.data ?? []) as Podiya[]);

      const raхunok = new Map<TypPodiyi, number>();
      for (const r of zMetryk.data ?? []) {
        const t = r.typ as TypPodiyi;
        raхunok.set(t, (raхunok.get(t) ?? 0) + 1);
      }
      setMetryky([...raхunok.entries()].map(([typ, kilkist]) => ({ typ, kilkist })));
      setStan("готово");
    })();
  }, []);

  return (
    <div className="konteyner">
      <header className="shapka">
        <h1>🔍 Моніторинг</h1>
        <a href="/" className="knopka" style={{ fontSize: 13, padding: "8px 12px" }}>
          ← Назад
        </a>
      </header>

      {stan === "завантаження" && <p className="pustyi">Завантаження…</p>}

      {stan === "не_власник" && (
        <section className="kartka">
          <p className="pustyi" style={{ margin: 0 }}>
            🔒 Ця панель — лише для власника.
          </p>
        </section>
      )}

      {stan === "готово" && (
        <>
          <section className="kartka" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
            <h2 style={{ marginTop: 0, fontSize: 15 }}>🧪 Демо для куратора</h2>
            <p className="pustyi" style={{ marginTop: 0 }}>
              Натисни — код навмисно «зламається», і помилка прилетить у цю панель.
            </p>
            <button
              className="knopka"
              style={{ background: "#dc2626" }}
              onClick={() => {
                setTimeout(() => {
                  throw new Error("Демо-помилка: щось зламалося навмисно");
                }, 0);
              }}
            >
              🔥 Спеціально зламати (і побачити лог)
            </button>
          </section>

          <section className="kartka">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Метрики (усього за весь час)</h2>
            {metryky.length === 0 ? (
              <p className="pustyi">Подій ще не було.</p>
            ) : (
              <div className="slots">
                {metryky.map((m) => (
                  <div className="slot" key={m.typ}>
                    <b style={{ fontSize: 22 }}>{m.kilkist}</b>
                    <div style={{ fontSize: 13, color: "#78716c" }}>
                      {CYFRA_TYPU[m.typ]} {m.typ}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="kartka">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Останні події (50)</h2>
            {podiyi.length === 0 ? (
              <p className="pustyi">Поки порожньо — і це добре 🙂</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {podiyi.map((p) => (
                  <li key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #e7e5e4" }}>
                    <div style={{ fontSize: 13, color: "#78716c" }}>
                      {CYFRA_TYPU[p.typ]} {p.typ} ·{" "}
                      {new Date(p.created_at).toLocaleString("uk-UA")}
                      {p.storinka && ` · ${p.storinka}`}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.povitomlennya}</div>
                    {p.detal && (
                      <details>
                        <summary style={{ fontSize: 13, color: "#0d9488", cursor: "pointer" }}>
                          деталі
                        </summary>
                        <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", margin: "6px 0 0" }}>
                          {p.detal}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
