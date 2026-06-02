import { getBrandIdentitySetting } from "@/lib/site-config";
import { ProfileClient } from "./_components/profile-client";

export default async function ProfilePage() {
  const brandIdentity = await getBrandIdentitySetting();

  return <ProfileClient brandIdentity={brandIdentity} />;
}
