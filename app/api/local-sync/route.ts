import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Local sync must never be available on Vercel/production.
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          success: false,
          error: "Local sync is disabled in production.",
        },
        { status: 403 }
      );
    }

    const hostname = request.headers.get("host") ?? "";

    const isLocal =
      hostname.startsWith("localhost:") ||
      hostname.startsWith("127.0.0.1:");

    if (!isLocal) {
      return NextResponse.json(
        {
          success: false,
          error: "Local sync can only run from localhost.",
        },
        { status: 403 }
      );
    }

    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "CRON_SECRET is missing from .env.local",
        },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;

    const response = await fetch(
      `${origin}/api/cron/creative-sync`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    let result: any;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        success: false,
        error: text || "Invalid response from creative sync",
      };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            result?.error ||
            `Creative sync failed (${response.status})`,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Local creative sync error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}