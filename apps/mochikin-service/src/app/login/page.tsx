import { redirect } from "next/navigation";
import { getServicesSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

interface LoginPageProps {
  searchParams?: Promise<{
    sso?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServicesSession();
  const sp = searchParams ? await searchParams : {};

  // If already authenticated, redirect to portal home
  if (session) {
    redirect("/");
  }

  // Handle SSO error redirects
  let ssoError: string | null = null;
  if (sp.sso === "unauthenticated") {
    ssoError = "Sesi Anda telah berakhir. Silakan masuk kembali.";
  } else if (sp.sso === "invalid") {
    ssoError = "Token SSO tidak valid atau telah kedaluwarsa. Silakan masuk kembali.";
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-white">
      <LoginForm initialError={ssoError} />

      <footer className="mt-8 text-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} PT Mochikin Sukses Selaras. Sistem autentikasi staf</p>
      </footer>
    </main>
  );
}
