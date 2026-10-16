// Тиждень 2+4+5: сторінка «вільні слоти».
// Швидкість — кеш; реальний час — оновлення самі; логи — панель моніторингу.

import { useEffect, useState } from "react";
import supabase from "./lib/supabase";
import { pryemyatyZminy, type PodiyiRealTime } from "./lib/realTime";
import { zapysatyPodiyu } from "./lib/zhurnaly";
import { stiykyyVyklyk } from "../server/stiykist";
import PanelMonitorynhu from "./pages/PanelMonitorynhu";

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
  const [shlyah, setShlyah] = useState(window.location.hash);
  useEffect(() => {
    const naHash = () => setShlyah(window.location.hash);
    window.addEventListener("hashchange", naHash);
    return () => window.removeEventListener("hashchange", naHash);
  }, []);

  const [sloty, setSloty] = useState<Slot[]>([]);
  const [zyavkaMS, setZyavkaMS] = useState<number | null>(null);
  const [stan, setStan] = useState<"завантаження" | "готово" | "помилка">("завантаження");
  const [pomylka, setPomylka] = useState("");
  const [ostannyaOnovlennya, setOstannyaOnovlennya] = useState<string | null>(null);

  useEffect(() => {
    const pochatok = performance.now();
    (async () => {
      try {
        // Тиждень 6: таймаут 4с + 1 повтор + запасний варіант (порожній список),
        // якщо Supabase ліг — сторінка показує «запасні дані», а не білу мить.
        const data = await stiykyyVyklyk(
          async () => {
            const { data, error } = await supabase
              .from("sloty")
              .select("id, pochatok")
              .eq("status", "vilnyi")
              .order("pochatok", { ascending: true })
              .limit(30);
            if (error) throw new Error(error.message);
            return (data ?? []) as Slot[];
          },
          { zapasnyi: [] as Slot[], timeoutMs: 4000, skilkyPovtoriv: 1, pauzaMs: 300 },
        );
        setSloty(data);
        setZyavkaMS(Math.round(performance.now() - pochatok));
        setStan("готово");
        void zapysatyPodiyu({
          typ: "podiya",
          povitomlennya: "Відкрив сторінку «Вільні слоти»",
          detal: `завантаження ${(performance.now() - pochatok).toFixed(0)} мс, слотів: ${data.length}`,
        });
      } catch (e) {
        setPomylka((e as Error).message);
        setStan("помилка");
      }
    })();
  }, []);

  // Реальний час: коли база міняється — перечитуємо список самі
  useEffect(() => {
    const vidpysatysya = pryemyatyZminy(supabase, ["sloty"], (podiya: PodiyiRealTime) => {
      setOstannyaOnovlennya(
        new Date().toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      );
      void (async () => {
        const { data } = await supabase
          .from("sloty")
          .select("id, pochatok")
          .eq("status", "vilnyi")
          .order("pochatok", { ascending: true })
          .limit(30);
        setSloty((data ?? []) as Slot[]);
      })();
      if (podiya.typ === "INSERT") {
        // коротке повідомлення — «слот з'явився»
      }
    });
    return vidpysatysya;
  }, []);

  if (shlyah === "#/monitoring") return <PanelMonitorynhu />;

  return (
    <div className="konteyner">
      <header className="shapka">
        <h1>🧳 Коли вільно</h1>
        <a href="#/monitoring" style={{ fontSize: 13, color: "#0d9488" }}>
          🔍 Моніторинг
        </a>
      </header>

      <section className="kartka">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Вільні слоти</h2>

        {stan === "завантаження" && <p className="pustyi">Завантаження…</p>}
        {stan === "помилка" && <p className="pomylka">{pomylka}</p>}

        {stan === "готово" && (
          <>
            <p className="pustyi">
              Завантажено за <b>{zyavkaMS} мс</b>
              {ostannyaOnovlennya && (
                <>
                  {" "}· оновлено <b>автоматично</b> о {ostannyaOnovlennya}
                </>
              )}
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
        Відкрий цю сторінку у двох вікнах — зміна в одному з'явиться в іншому сама.
      </p>
    </div>
  );
}
