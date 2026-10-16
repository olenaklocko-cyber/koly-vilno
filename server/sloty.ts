// Найповільніше місце продукту: «показати місяць вільних слотів майстра».
// Без кешу: кожен відвідувач кладе на базу однаковий запит (проблема «N+1»
// і повільного розкладу). З кешем: відповідь пам'ятається кілька хвилин.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Kesh } from "./kesh";

export type Slot = {
  id: number;
  mayster_id: number;
  pochatok: string;
  kinec: string;
};

export function klientZSupabase(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}

// БЕЗ КЕШУ — «було»
export async function vilitniSlotyBezKeshu(
  db: SupabaseClient,
  maysterId: number,
): Promise<Slot[]> {
  const { data, error } = await db
    .from("sloty")
    .select("id, mayster_id, pochatok, kinec")
    .eq("mayster_id", maysterId)
    .eq("status", "vilnyi")
    .order("pochatok", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Slot[];
}

// З КЕШЕМ (TTL 2 хв) — «стало»
const keshSlotiv = new Kesh<Slot[]>(2 * 60 * 1000);

export async function vilitniSlotyZKeshem(
  db: SupabaseClient,
  maysterId: number,
): Promise<Slot[]> {
  return keshSlotiv.aboObchyslyty(`sloty:${maysterId}`, () =>
    vilitniSlotyBezKeshu(db, maysterId),
  );
}

export function ochystytyKeshSlotiv(): void {
  keshSlotiv.ochystyty();
}
