import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { WorkshopClientPage } from "./workshop-client";

export default async function WorkshopPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.user_id) {
    redirect("/login?redirect=/workshop");
  }

  return <WorkshopClientPage />;
}
