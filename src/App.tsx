// Тиждень 2: сторінка «вільні слоти» (поки без входу) + вимірювання швидкості.
// Mobile-first: одна колонка на телефоні, три на широкому екрані.

import { useEffect, useState } from "react";

type Slot = { id: number; pochatok: string };

function chasUkyiv(ishodna: string): string {
  return new Date(ishodna).toLocaleString("uk-UA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  });
}

export default function App() {
  const [sloty, setSloty] = useState<Slot[]>([]);
  const [zyavkaMS, setZyavkaMS] = useState<number | null>(null);
  const [stan, setStan] = useState<"завантаження" | "готово" | "помилка">("завантаження");
  const [pomylka, setPomylka] = useState("");

  useEffect(() => {
    const pochatok = performance.now();
    fetch("/api/sloty/vilni?mayster_id=1")
      .then((r) => {
        if (!r.ok) throw new Error(`Сервер відповів ${r.status}`);
        return r.json();
      })
      .then((d: { sloty: Slot[] }) => {
        setSloty(d.sloty);
        setZyavkaMS(Math.round(performance.now() - pochatok));
        setStan("готово");
      })
      .catch((e: Error) => {
        setPomylka(e.message);
        setStan("помилка");
      });
  }, []);

  return (
    <div className="konteyner">
      <header className="shapka">
        <h1>🧳 Коли вільно</h1>
        <span style={{ fontSize: 13, color: "#78716c" }}>демо</span>
      </header>

      <section className="kartka">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Вільні слоти майстра</h2>

        {stan === "завантаження" && <p className="pustyi">Завантаження…</p>}
        {stan === "помилка" && (
          <p className="pomylka">
            {pomylka} — локально сервер ще не запущено (npm run server)
          </p>
        )}

        {stan === "готово" && (
          <>
            <p className="pustyi">
              Запит виконано за <b>{zyavkaMS} мс</b> (сервер зараз вимірює це для тижня 2)
            </p>
            {sloty.length === 0 ? (
              <p className="pustyi">Поки немає вільних слотів.</p>
            ) : (
              <div className="slots">
                {sloty.map((s) => (
                  <div className="slot" key={s.id}>
                    {chasUkyiv(s.pochatok)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <p className="pustyi" style={{ fontSize: 13 }}>
        Мобільна + десктопна версії — з першого дня (адаптивна сітка слотів).
      </p>
    </div>
  );
}
