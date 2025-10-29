import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get the upload URL from environment
    const uploadApi =
      process.env.NEXT_PUBLIC_UPLOAD_API ||
      "https://your-upload-worker.workers.dev";
    const uploadUrl = uploadApi + "/upload";

    console.log("Proxying upload request to:", uploadUrl);

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
        // Add CORS headers
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

    console.log("Upload worker response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload worker error:", errorText);
      return NextResponse.json(
        { error: `Upload worker error: ${response.status}`, success: false },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Upload successful:", data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      {
        error: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        success: false,
      },
      { status: 500 }
    );
  }
}
