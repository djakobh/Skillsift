import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import AccountShell from "./AccountShell";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  // Ensure settings row exists
  const settings = await db.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id }, // defaults
    update: {},
  });

  return (
    <AccountShell
      initialDarkMode={settings.prefersDarkMode}
      initialLanguage={settings.languagePref ?? "JavaScript"}
    >
      {children}
    </AccountShell>
  );
}
