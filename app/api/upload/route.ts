import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // For Cloudflare Pages Functions, we redirect to the actual upload worker
    const uploadUrl =
      process.env.NEXT_PUBLIC_UPLOAD_API ||
      "https://uploader-worker-v2-prod.haoweiw370.workers.dev/upload";

    // Get the form data from the request
    const formData = await request.formData();

    // Forward the request to the actual upload worker
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: {
        // Forward authorization header if present
        ...(request.headers.get("authorization") && {
          Authorization: request.headers.get("authorization")!,
        }),
        ...(request.headers.get("cf-turnstile-token") && {
          "CF-Turnstile-Token": request.headers.get("cf-turnstile-token")!,
        }),
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Upload failed", success: false },
      { status: 500 }
    );
  }
}
