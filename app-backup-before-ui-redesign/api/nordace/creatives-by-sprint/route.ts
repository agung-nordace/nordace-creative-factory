import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sprintId = request.nextUrl.searchParams.get("sprintId");

    if (!sprintId) {
      return NextResponse.json(
        { success: false, error: "Missing sprintId" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.ND_API_BASE_URL;
    const token = process.env.ND_API_TOKEN;

    if (!baseUrl || !token) {
      return NextResponse.json(
        { success: false, error: "Missing Nordace API config" },
        { status: 500 }
      );
    }

    const matches: any[] = [];

    let page = 1;
    let totalPages = 1;

    do {
      const url =
        `${baseUrl}/api/v1/sync/creatives` +
        `?page=${page}&limit=100`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Nordace API failed on page ${page}`);
      }

      const json = await response.json();

      const items = Array.isArray(json?.data)
        ? json.data
        : [];

      for (const creative of items) {
        if (String(creative?.team?.id) === String(sprintId)) {
          matches.push(creative);
        }
      }

      totalPages =
        json?.pagination?.pages ?? 1;

      page++;
    } while (page <= totalPages);

    return NextResponse.json({
      success: true,
      sprintId,
      total: matches.length,
      data: matches,
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