import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";

import { db, users } from "@louez/db";

import { auth } from "@/lib/auth";

import { SourceClientPage } from "./source-client-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function OnboardingSourcePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  // Already answered (or set programmatically, e.g. 'invitation'): nothing to ask.
  if (user?.acquisitionChannel) {
    redirect("/dashboard");
  }

  return <SourceClientPage />;
}
