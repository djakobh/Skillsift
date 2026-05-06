import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import TechnicalInterviewViewSwitcher from "./technicalInterview";

export default async function TechnicalInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;

  return (
    <TechnicalInterviewViewSwitcher resumeSessionId={params.sessionId} />
  );
}
