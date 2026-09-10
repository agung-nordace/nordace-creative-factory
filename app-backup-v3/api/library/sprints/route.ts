import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const teamId =
      request.nextUrl.searchParams.get("team_id");

    let query = supabaseAdmin
      .from("sprints")
      .select("id, team_id, name, description")
      .order("name", { ascending: true });

    if (teamId && teamId !== "all") {
      query = query.eq("team_id", Number(teamId));
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
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