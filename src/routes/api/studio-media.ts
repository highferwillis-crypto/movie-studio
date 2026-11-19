import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/studio-media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestId = new URL(request.url).searchParams.get("requestId") ?? "";
        const { proxyVideo } = await import("@/lib/studio/xai.server");
        return proxyVideo(requestId);
      },
    },
  },
});
