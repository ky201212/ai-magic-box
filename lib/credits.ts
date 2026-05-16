import "server-only";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCreditPolicySetting } from "@/lib/admin-data";

export const INITIAL_CREDITS = 50;

type CreditRow = {
  user_id: string;
  credits: number;
};

export type CreditLogRow = {
  id: string;
  user_id: string;
  change_amount: number;
  balance_after: number;
  reason_code: string;
  reason_label: string;
  note: string | null;
  created_at: string;
};

type ConsumeCreditsResult = {
  success: boolean;
  remaining: number;
};

type AdjustCreditsResult = {
  credits: number;
};

type UserCreditInsertPayload = {
  user_id: string;
  credits: number;
};

type UserCreditLogInsertPayload = {
  user_id: string;
  change_amount: number;
  balance_after: number;
  reason_code: string;
  reason_label: string;
  note?: string | null;
};

type CreditLogFallbackValue = {
  logs: CreditLogRow[];
};

function isMissingCreditLogTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && error.code === "PGRST205";
}

function getCreditLogFallbackKey(userId: string) {
  return `credits.logs.${userId}`;
}

async function appendFallbackCreditLog(input: UserCreditLogInsertPayload) {
  const supabaseAdmin = getSupabaseAdmin();
  const settingKey = getCreditLogFallbackKey(input.user_id);
  const nextLog: CreditLogRow = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    change_amount: input.change_amount,
    balance_after: input.balance_after,
    reason_code: input.reason_code,
    reason_label: input.reason_label,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
  };

  const { data: existingSetting, error: fetchError } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("setting_key", settingKey)
    .maybeSingle<{ value: CreditLogFallbackValue }>();

  if (fetchError) {
    throw fetchError;
  }

  const existingLogs = existingSetting?.value?.logs ?? [];
  const nextLogs = [nextLog, ...existingLogs].slice(0, 100);

  const { error: upsertError } = await supabaseAdmin.from("site_settings").upsert(
    {
      setting_key: settingKey,
      setting_group: "credits",
      label: "用户魔法币日志备份",
      value: { logs: nextLogs },
      description: "当 user_credit_logs 不可用时使用的后备日志存储。",
    } as never,
    { onConflict: "setting_key" },
  );

  if (upsertError) {
    throw upsertError;
  }
}

async function listFallbackCreditLogs(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const settingKey = getCreditLogFallbackKey(userId);
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("setting_key", settingKey)
    .maybeSingle<{ value: CreditLogFallbackValue }>();

  if (error) {
    throw error;
  }

  return data?.value?.logs ?? [];
}

async function createCreditLog(input: UserCreditLogInsertPayload) {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.from("user_credit_logs").insert({
    user_id: input.user_id,
    change_amount: input.change_amount,
    balance_after: input.balance_after,
    reason_code: input.reason_code,
    reason_label: input.reason_label,
    note: input.note ?? null,
  } as never);

  if (error) {
    if (isMissingCreditLogTable(error)) {
      console.warn("魔法币日志表暂不可用，已写入后备日志存储。", error);
      await appendFallbackCreditLog(input);
      return;
    }

    throw error;
  }
}

export async function createCreditLogEntry(input: {
  userId: string;
  changeAmount: number;
  balanceAfter: number;
  reasonCode: string;
  reasonLabel: string;
  note?: string | null;
}) {
  await createCreditLog({
    user_id: input.userId,
    change_amount: input.changeAmount,
    balance_after: input.balanceAfter,
    reason_code: input.reasonCode,
    reason_label: input.reasonLabel,
    note: input.note ?? null,
  });
}

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

  await createCreditLog({
    user_id: userId,
    change_amount: Math.max(0, creditPolicy.initialCredits ?? INITIAL_CREDITS),
    balance_after: insertedRow.credits,
    reason_code: "signup_bonus",
    reason_label: "新用户欢迎礼包",
    note: "首次注册，系统赠送初始魔法币。",
  });

  return insertedRow;
}

export async function consumeCredits(
  userId: string,
  cost: number,
  metadata?: {
    reasonCode?: string;
    reasonLabel?: string;
    note?: string;
  },
) {
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

  if (data?.success) {
    await createCreditLog({
      user_id: userId,
      change_amount: -Math.max(0, cost),
      balance_after: data.remaining,
      reason_code: metadata?.reasonCode ?? "feature_consume",
      reason_label: metadata?.reasonLabel ?? "功能消耗",
      note: metadata?.note ?? null,
    });
  }

  return data;
}

export async function addCredits(
  userId: string,
  amount: number,
  metadata?: {
    reasonCode?: string;
    reasonLabel?: string;
    note?: string;
  },
) {
  await ensureUserCredits(userId);
  const supabaseAdmin = getSupabaseAdmin();
  const normalizedAmount = Math.max(0, amount);

  if (!normalizedAmount) {
    const { data, error } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single<AdjustCreditsResult>();

    if (error) {
      throw error;
    }

    return data.credits;
  }

  const { data: currentCredits, error: fetchError } = await supabaseAdmin
    .from("user_credits")
    .select("credits")
    .eq("user_id", userId)
    .single<AdjustCreditsResult>();

  if (fetchError) {
    throw fetchError;
  }

  const nextCredits = (currentCredits?.credits ?? 0) + normalizedAmount;

  const { error: updateError } = await supabaseAdmin
    .from("user_credits")
    .update({
      credits: nextCredits,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("user_id", userId);

  if (updateError) {
    throw updateError;
  }

  await createCreditLog({
    user_id: userId,
    change_amount: normalizedAmount,
    balance_after: nextCredits,
    reason_code: metadata?.reasonCode ?? "credit_refund",
    reason_label: metadata?.reasonLabel ?? "魔法币退回",
    note: metadata?.note ?? null,
  });

  return nextCredits;
}

export async function listUserCreditLogs(userId: string, limit = 30) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("user_credit_logs")
    .select(
      "id, user_id, change_amount, balance_after, reason_code, reason_label, note, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CreditLogRow[]>();

  if (error) {
    if (isMissingCreditLogTable(error)) {
      console.warn("魔法币日志表暂不可用，已改为读取后备日志存储。", error);
      return listFallbackCreditLogs(userId);
    }

    throw error;
  }

  return data ?? [];
}
