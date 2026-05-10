import VideoPlayerWithOverlay, {
  type VideoAnalysisSegment,
} from "~/components/VideoPlayerWithOverlay";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";

export default async function VideoAnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) redirect("/login");

  const { id } = await params;

  const video = await db.videoUpload.findUnique({
    where: { id },
    include: {
      segments: {
        orderBy: { startSec: "asc" },
      },
    },
  });

  if (!video || video.userId !== user.id) {
    redirect("/video-analysis");
  }

  return (
    <main className="min-h-screen p-8">
      <VideoPlayerWithOverlay
        videoSrc={`/api/videos/${video.id}`}
        segments={video.segments as VideoAnalysisSegment[]}
        title={video.originalName}
      />
    </main>
  );
}