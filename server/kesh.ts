// Кеш у пам'яті з TTL (time-to-live) — «запам'ятати відповідь, щоб не рахувати заново».
// Проблема «N+1 запитів» і повільного розкладу: те саме питання
// «які слоти вільні?» ставлять усі відвідувачі — і база рахує це щоразу.

export type KeshZapis<T> = { znachennya: T; do: number };

export class Kesh<T> {
  private sklad = new Map<string, KeshZapis<T>>();

  constructor(private ttlMs: number) {}

  otrymaty(klyuch: string): T | undefined {
    const zapys = this.sklad.get(klyuch);
    if (!zapys) return undefined;
    if (Date.now() > zapys.do) {
      this.sklad.delete(klyuch); // протермінувалося — забули
      return undefined;
    }
    return zapys.znachennya;
  }

  poklasty(klyuch: string, znachennya: T): void {
    this.sklad.set(klyuch, { znachennya, do: Date.now() + this.ttlMs });
  }

  skilky(): number {
    return this.sklad.size;
  }

  ochystyty(): void {
    this.sklad.clear();
  }

  // «Мети-куда-схоже»: якщо кеш порожній або прострочений — обчислити й покласти
  async aboObchyslyty(klyuch: string, obchyslyuvach: () => Promise<T>): Promise<T> {
    const e = this.otrymaty(klyuch);
    if (e !== undefined) return e;
    const znachennya = await obchyslyuvach();
    this.poklasty(klyuch, znachennya);
    return znachennya;
  }
}
