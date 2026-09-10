import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.ND_API_BASE_URL;
    const token = process.env.ND_API_TOKEN;

    if (!baseUrl || !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Nordace API configuration",
        },
        { status: 500 }
      );
    }

    const sprintId = request.nextUrl.searchParams.get("sprint_id");
    const page = request.nextUrl.searchParams.get("page") || "1";
    const perPage =
      request.nextUrl.searchParams.get("per_page") || "50";

    if (!sprintId) {
      return NextResponse.json(
        {
          success: false,
          error: "sprint_id is required",
        },
        { status: 400 }
      );
    }

    const apiUrl = new URL("/api/v1/creatives", baseUrl);

    apiUrl.searchParams.set("sprint_id", sprintId);
    apiUrl.searchParams.set("page", page);
    apiUrl.searchParams.set("per_page", perPage);

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const raw = await response.text();

    let data: unknown;

    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

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
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}