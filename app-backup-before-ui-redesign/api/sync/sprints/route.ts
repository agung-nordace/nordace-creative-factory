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

    // =========================================================
    // 1. FETCH SPRINTS FROM NORDACE
    // =========================================================

    const response = await fetch(
      `${baseUrl}/api/v1/sync/sprints`,
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
          error: "Failed to fetch Nordace sprints",
          status: response.status,
          details: text,
        },
        { status: response.status }
      );
    }

    const payload = await response.json();

    const sprints = Array.isArray(payload?.data)
      ? payload.data
      : [];

    if (sprints.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nordace API returned no sprints",
        },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    // =========================================================
    // 2. COLLECT ALL TEAMS EMBEDDED IN SPRINTS
    //
    // Some old/legacy teams may not be returned by /sync/teams.
    // We create/update them first so foreign keys remain valid.
    // =========================================================

    const teamMap = new Map<number, any>();

    for (const sprint of sprints) {
      const teamId =
        sprint.teamId != null
          ? Number(sprint.teamId)
          : sprint.team?.id != null
            ? Number(sprint.team.id)
            : null;

      if (teamId == null) continue;

      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, {
          id: teamId,
          name:
            sprint.team?.name ??
            `Legacy Team ${teamId}`,
          description:
            sprint.team?.description ?? null,
          created_at:
            sprint.team?.createdAt ?? null,
          updated_at:
            sprint.team?.updatedAt ?? null,
          synced_at: now,
        });
      }
    }

    const embeddedTeams = Array.from(teamMap.values());

    // =========================================================
    // 3. UPSERT MISSING / LEGACY TEAMS FIRST
    // =========================================================

    const TEAM_BATCH_SIZE = 500;

    for (
      let i = 0;
      i < embeddedTeams.length;
      i += TEAM_BATCH_SIZE
    ) {
      const batch = embeddedTeams.slice(
        i,
        i + TEAM_BATCH_SIZE
      );

      const { error } = await supabaseAdmin
        .from("teams")
        .upsert(batch, {
          onConflict: "id",
        });

      if (error) {
        throw new Error(
          `Failed syncing embedded teams: ${error.message}`
        );
      }
    }

    // =========================================================
    // 4. PREPARE SPRINT ROWS
    // =========================================================

    const sprintRows = sprints
      .filter((sprint: any) => sprint?.id != null)
      .map((sprint: any) => {
        const teamId =
          sprint.teamId != null
            ? Number(sprint.teamId)
            : sprint.team?.id != null
              ? Number(sprint.team.id)
              : null;

        return {
          id: Number(sprint.id),

          name: String(
            sprint.name ?? `Sprint ${sprint.id}`
          ),

          description:
            sprint.description ?? null,

          team_id: teamId,

          created_at:
            sprint.createdAt ?? null,

          updated_at:
            sprint.updatedAt ?? null,

          synced_at: now,
        };
      });

    // =========================================================
    // 5. UPSERT SPRINTS
    // =========================================================

    const SPRINT_BATCH_SIZE = 500;

    let synced = 0;

    for (
      let i = 0;
      i < sprintRows.length;
      i += SPRINT_BATCH_SIZE
    ) {
      const batch = sprintRows.slice(
        i,
        i + SPRINT_BATCH_SIZE
      );

      const { error } = await supabaseAdmin
        .from("sprints")
        .upsert(batch, {
          onConflict: "id",
        });

      if (error) {
        throw new Error(
          `Failed syncing sprints: ${error.message}`
        );
      }

      synced += batch.length;
    }

    // =========================================================
    // 6. UPDATE SYNC STATE
    // =========================================================

    await supabaseAdmin
      .from("sync_state")
      .upsert(
        {
          source: "nordace_sprints",
          status: "idle",
          current_page: 0,
          total_records: synced,
          synced_records: synced,
          last_completed_at: now,
          last_error: null,
          updated_at: now,
        },
        {
          onConflict: "source",
        }
      );

    // =========================================================
    // DONE
    // =========================================================

    return NextResponse.json({
      success: true,
      message: "Nordace sprints synced successfully",
      fetched: sprints.length,
      synced,
      teamsReferenced: embeddedTeams.length,
    });
  } catch (error) {
    console.error("Sprints sync error:", error);

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