import { getBrandProfile } from "@/lib/brandProfileService";
import { BrandProfileSettings } from "@/components/BrandProfileSettings";

export const metadata = {
  title: "Profil Brand & SaaS — MyService Admin",
};

export default async function AdminBrandPage() {
  const brandProfile = await getBrandProfile();
  return <BrandProfileSettings initialProfile={brandProfile} />;
}
