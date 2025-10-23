import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    // For Cloudflare Pages Functions, we redirect to the actual history worker
    const historyUrl =
      process.env.NEXT_PUBLIC_HISTORY_API ||
      "https://history-worker-v2-prod.haoweiw370.workers.dev/api/history";

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
    return NextResponse.json(
      { error: "Failed to fetch uploads", uploads: [] },
      { status: 500 }
    );
  }
}
