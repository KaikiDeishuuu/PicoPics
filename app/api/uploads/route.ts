import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // For Cloudflare Pages Functions, we redirect to the actual history worker
    const historyApi =
      process.env.NEXT_PUBLIC_HISTORY_API ||
      "https://your-history-worker.workers.dev";
    const historyUrl = historyApi + "/api/history";

    // Forward the request to the actual history worker
    const response = await fetch(historyUrl, {
      method: "GET",
      headers: {
        // Forward authorization header if present
        ...(request.headers.get("authorization") && {
          Authorization: request.headers.get("authorization")!,
        }),
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Uploads API error:", error);
    return NextResponse.json({ error: "Failed to fetch uploads", uploads: [] }, { status: 500 });
  }
}
