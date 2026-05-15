import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type UserRow = {
  id: string;
  phone: string;
  status?: "active" | "disabled";
};

type UserInsertPayload = {
  phone: string;
};

export async function ensureUserByPhone(phone: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existingUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, phone, status")
    .eq("phone", phone)
    .maybeSingle<UserRow>();

  if (fetchError) {
    throw fetchError;
  }

  if (existingUser) {
    return existingUser;
  }

  const insertPayload: UserInsertPayload = { phone };

  const { data: insertedUser, error: insertError } = await supabaseAdmin
    .from("users")
    .insert(insertPayload as never)
    .select("id, phone, status")
    .single<UserRow>();

  if (insertError) {
    throw insertError;
  }

  return insertedUser;
}
