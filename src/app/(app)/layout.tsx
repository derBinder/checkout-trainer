import { AppNav } from "@/components/app-nav";
import { requireActiveUser } from "@/lib/auth/guard";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireActiveUser();

  return (
    <>
      <AppNav isAdmin={user.role === "admin"} />
      <main className="mx-auto w-full max-w-2xl px-5 pt-10 pb-nav-clearance md:pt-12 md:pb-16">
        {children}
      </main>
    </>
  );
}
