import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.ND_API_BASE_URL;
    const token = process.env.ND_API_TOKEN;

    if (!baseUrl || !token) {
      return NextResponse.json(
        { success: false, error: "Missing Nordace API configuration" },
        { status: 500 }
      );
    }

    // Ambil semua query parameter dari browser
    const incomingParams = request.nextUrl.searchParams;

    // Forward query parameter ke Nordace API
    const apiUrl = new URL("/api/v1/sync/creatives", baseUrl);

    incomingParams.forEach((value, key) => {
      apiUrl.searchParams.set(key, value);
    });

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Nordace creatives proxy error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}