import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, CF-Turnstile-Token",
};

function toJsonResponse(payload: unknown, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: corsHeaders,
  });
}

function getUploadApiBaseUrl() {
  return process.env.UPLOAD_API || process.env.NEXT_PUBLIC_UPLOAD_API;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  const uploadApiBase = getUploadApiBaseUrl();

  if (!uploadApiBase) {
    return toJsonResponse(
      {
        success: false,
        error: "UPLOAD_API is not configured.",
        code: "UPLOAD_API_NOT_CONFIGURED",
        message: "Please configure UPLOAD_API in the server environment.",
      },
      500
    );
  }

  const uploadUrl = `${uploadApiBase.replace(/\/$/, "")}/upload`;

  try {
    const formData = await request.formData();
    const upstreamHeaders = new Headers();
    const authorization = request.headers.get("authorization");
    const turnstileToken = request.headers.get("cf-turnstile-token");

    if (authorization) {
      upstreamHeaders.set("Authorization", authorization);
    }
    if (turnstileToken) {
      upstreamHeaders.set("CF-Turnstile-Token", turnstileToken);
    }

    const upstreamResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: upstreamHeaders,
    });

    const text = await upstreamResponse.text();
    let jsonPayload: unknown = null;
    if (text) {
      try {
        jsonPayload = JSON.parse(text);
      } catch {
        jsonPayload = null;
      }
    }

    if (jsonPayload) {
      return toJsonResponse(jsonPayload, upstreamResponse.status);
    }

    return toJsonResponse(
      {
        success: upstreamResponse.ok,
        error: upstreamResponse.ok
          ? undefined
          : `Upload failed with status ${upstreamResponse.status}.`,
        code: upstreamResponse.ok ? undefined : "UPSTREAM_UPLOAD_ERROR",
        message: upstreamResponse.ok
          ? "Upload completed."
          : "Upload service returned an empty response.",
      },
      upstreamResponse.status
    );
  } catch (error) {
    return toJsonResponse(
      {
        success: false,
        error: "Upload proxy failed.",
        code: "UPLOAD_PROXY_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
