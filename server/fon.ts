// Тиждень 3: фонові задачі.
// Робот виконує довгу/повторювану роботу «в тиші» — користувач не чекає.
// Дві задачі:
// 1) нічне зведення майстру (крон, раз на день);
// 2) просування черги — викликається одразу, коли слот звільнився.

import type { SupabaseClient } from "@supabase/supabase-js";

// Нічне зведення: «завтра N занять, M вільних» для всіх майстрів.
// У проді це запускає cron (GitHub Actions за розкладом).
export async function zrobytyZvedennya(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.rpc("zrobyty_zvedennya");
  if (error) throw new Error(`zrobyty_zvedennya: ${error.message}`);
  return Number(data ?? 0);
}

// Слот звільнився → перший із черги отримує його.
// Викликається «зараз», бо людина чекає на відповідь.
export async function peremkynutySlot(
  db: SupabaseClient,
  slotId: number,
): Promise<uuid | null> {
  const { data, error } = await db.rpc("peremkynuty_slot", {
    p_slot_id: slotId,
  });
  if (error) throw new Error(`peremkynuty_slot: ${error.message}`);
  return (data as uuid | null) ?? null;
}

type uuid = string;

// «Скасувався запис» → звільнив слот → одразу віддав наступному в черзі.
export async function skasuvatyTaPeredaty(
  db: SupabaseClient,
  bronuvannyaId: number,
): Promise<uuid | null> {
  const { data: bron, error: e1 } = await db
    .from("bronuvannya")
    .select("id, slot_id, status")
    .eq("id", bronuvannyaId)
    .single();
  if (e1) throw new Error(e1.message);
  if (!bron || bron.status !== "aktivne") return null;

  const { error: e2 } = await db
    .from("bronuvannya")
    .update({ status: "skasovane" })
    .eq("id", bronuvannyaId);
  if (e2) throw new Error(e2.message);

  return peremkynutySlot(db, bron.slot_id as number);
}
