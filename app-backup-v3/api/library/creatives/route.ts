import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const teamId = params.get("team_id");
    const sprintId = params.get("sprint_id");
    const search = params.get("search")?.trim() || "";

    const page = Math.max(
      Number(params.get("page") || "1"),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(params.get("limit") || DEFAULT_LIMIT),
        1
      ),
      MAX_LIMIT
    );

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("creatives")
      .select(
        `
        id,
        name,
        description,
        type,
        file_url,
        thumbnail_url,
        optimized_url,
        width,
        height,
        file_size,
        mime_type,
        team_id,
        sprint_id,
        created_at,
        updated_at,
        sprints (
          id,
          name,
          team_id
        )
      `,
        { count: "exact" }
      )
      .order("created_at", {
        ascending: false,
      })
      .range(from, to);

    if (teamId && teamId !== "all") {
      query = query.eq(
        "team_id",
        Number(teamId)
      );
    }

    if (sprintId && sprintId !== "all") {
      query = query.eq(
        "sprint_id",
        Number(sprintId)
      );
    }

    if (search) {
      const safeSearch = search.replace(/[%_]/g, "");

      query = query.ilike(
        "name",
        `%${safeSearch}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const total = count ?? 0;
    const pages = Math.max(
      Math.ceil(total / limit),
      1
    );

    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page < pages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
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