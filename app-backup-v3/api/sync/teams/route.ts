import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST() {
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

    // 1. Ambil teams dari ND Creative AI
    const response = await fetch(
      `${baseUrl}/api/v1/sync/teams`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text();

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch Nordace teams",
          status: response.status,
          details: text,
        },
        { status: response.status }
      );
    }

    const payload = await response.json();

    const teams = Array.isArray(payload?.data)
      ? payload.data
      : [];

    if (teams.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nordace API returned no teams",
        },
        { status: 500 }
      );
    }

    // 2. Format untuk Supabase
    const now = new Date().toISOString();

    const rows = teams.map((team: any) => ({
      id: Number(team.id),
      name: String(team.name),
      description: team.description ?? null,
      created_at: team.createdAt ?? null,
      updated_at: team.updatedAt ?? null,
      synced_at: now,
    }));

    // 3. Upsert
    // Kalau ID sudah ada → update.
    // Kalau belum ada → insert.
    const { error } = await supabaseAdmin
      .from("teams")
      .upsert(rows, {
        onConflict: "id",
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Nordace teams synced successfully",
      synced: rows.length,
    });
  } catch (error) {
    console.error("Teams sync error:", error);

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