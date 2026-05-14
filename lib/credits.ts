import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCreditPolicySetting } from "@/lib/admin-data";

export const INITIAL_CREDITS = 50;

type CreditRow = {
  user_id: string;
  credits: number;
};

type ConsumeCreditsResult = {
  success: boolean;
  remaining: number;
};

type UserCreditInsertPayload = {
  user_id: string;
  credits: number;
};

export async function ensureUserCredits(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const creditPolicy = await getCreditPolicySetting().catch(() => ({
    initialCredits: INITIAL_CREDITS,
  }));

  const { data: existingRow, error: fetchError } = await supabaseAdmin
    .from("user_credits")
    .select("user_id, credits")
    .eq("user_id", userId)
    .maybeSingle<CreditRow>();

  if (fetchError) {
    throw fetchError;
  }

  if (existingRow) {
    return existingRow;
  }

  const insertPayload: UserCreditInsertPayload = {
    user_id: userId,
    credits: Math.max(0, creditPolicy.initialCredits ?? INITIAL_CREDITS),
  };

  const { data: insertedRow, error: insertError } = await supabaseAdmin
    .from("user_credits")
    .insert(insertPayload as never)
    .select("user_id, credits")
    .single<CreditRow>();

  if (insertError) {
    throw insertError;
  }

  return insertedRow;
}

export async function consumeCredits(userId: string, cost: number) {
  await ensureUserCredits(userId);
  const supabaseAdmin = getSupabaseAdmin();
  const rpcPayload = {
    p_user_id: userId,
    p_cost: cost,
  };

  const { data, error } = await supabaseAdmin
    .rpc("consume_credits" as never, rpcPayload as never)
    .single<ConsumeCreditsResult>();

  if (error) {
    throw error;
  }

  return data;
}
