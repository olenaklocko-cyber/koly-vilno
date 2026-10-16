import { describe, it, expect } from "vitest";
import { Kesh } from "./kesh";

describe("Kesh (тиждень 2 — швидкість)", () => {
  it("повертає покладене значення", () => {
    const k = new Kesh<number>(1000);
    k.poklasty("sloty", 42);
    expect(k.otrymaty("sloty")).toBe(42);
  });

  it("забуває після TTL (протермінування)", async () => {
    const k = new Kesh<number>(10);
    k.poklasty("x", 1);
    await new Promise((r) => setTimeout(r, 20));
    expect(k.otrymaty("x")).toBeUndefined();
  });

  it("не рахує заново, якщо є в кеші (обчислювач — 1 раз)", async () => {
    const k = new Kesh<string>(1000);
    let raziv = 0;
    const rahunok = async () => {
      raziv++;
      return "повільно";
    };
    await k.aboObchyslyty("k", rahunok);
    await k.aboObchyslyty("k", rahunok);
    await k.aboObchyslyty("k", rahunok);
    expect(raziv).toBe(1);
  });

  it("різні ключі — різне значення", () => {
    const k = new Kesh<number>(1000);
    k.poklasty("a", 1);
    k.poklasty("b", 2);
    expect(k.otrymaty("a")).toBe(1);
    expect(k.otrymaty("b")).toBe(2);
  });

  it("очищення порожнє", () => {
    const k = new Kesh<number>(1000);
    k.poklasty("a", 1);
    k.ochystyty();
    expect(k.skilky()).toBe(0);
  });
});
