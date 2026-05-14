import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function sendUserNotification(input: {
  userId: string;
  title: string;
  body: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const sentAt = new Date().toISOString();

  const { data: notification, error: notificationError } = await supabaseAdmin
    .from("notifications")
    .insert(
      {
        title: input.title,
        body: input.body,
        target_type: "users",
        target_user_ids: [input.userId],
        status: "sent",
        sent_at: sentAt,
        created_by: null,
      } as never,
    )
    .select("id")
    .single<{ id: string }>();

  if (notificationError) {
    throw notificationError;
  }

  const { error: recipientError } = await supabaseAdmin
    .from("user_notifications")
    .upsert(
      {
        notification_id: notification.id,
        user_id: input.userId,
      } as never,
      { onConflict: "notification_id,user_id" },
    );

  if (recipientError) {
    throw recipientError;
  }

  return notification.id;
}
