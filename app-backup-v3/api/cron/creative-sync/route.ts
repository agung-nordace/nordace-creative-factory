import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE_SIZE = 100;
const PAGES_TO_CHECK = 5;

async function runCreativeSync(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "CRON_SECRET is not configured",
        },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

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

    let checked = 0;
    let upserted = 0;

    for (let page = 1; page <= PAGES_TO_CHECK; page++) {
      const url =
        `${baseUrl}/api/v1/sync/creatives` +
        `?page=${page}&limit=${PAGE_SIZE}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const details = await response.text();

        throw new Error(
          `Nordace API failed on page ${page}: ` +
            `${response.status} ${details}`
        );
      }

      const payload = await response.json();

      const creatives: any[] = Array.isArray(payload?.data)
        ? payload.data
        : [];

      checked += creatives.length;

      const candidateSprintIds = Array.from(
        new Set<number>(
          creatives
            .map((creative: any): number | null => {
              if (creative?.team?.id == null) {
                return null;
              }

              const id = Number(creative.team.id);

              return Number.isFinite(id) ? id : null;
            })
            .filter(
              (id: number | null): id is number =>
                id !== null
            )
        )
      );

      const validSprintIds = new Set<number>();
      const sprintTeamMap = new Map<number, number | null>();

      if (candidateSprintIds.length > 0) {
        const {
          data: sprintRows,
          error: sprintError,
        } = await supabaseAdmin
          .from("sprints")
          .select("id, team_id")
          .in("id", candidateSprintIds);

        if (sprintError) {
          throw new Error(
            `Failed resolving sprint IDs: ${sprintError.message}`
          );
        }

        for (const sprint of sprintRows ?? []) {
          const sprintId = Number(sprint.id);

          validSprintIds.add(sprintId);

          sprintTeamMap.set(
            sprintId,
            sprint.team_id != null
              ? Number(sprint.team_id)
              : null
          );
        }
      }

      const now = new Date().toISOString();

      const rows = creatives
        .filter(
          (creative: any) => creative?.id != null
        )
        .map((creative: any) => {
          const candidateSprintId =
            creative?.team?.id != null
              ? Number(creative.team.id)
              : null;

          const sprintId =
            candidateSprintId != null &&
            validSprintIds.has(candidateSprintId)
              ? candidateSprintId
              : null;

          return {
            id: Number(creative.id),

            name: String(
              creative.name ??
                `Creative ${creative.id}`
            ),

            description:
              creative.description ?? null,

            type:
              creative.type ?? null,

            file_url:
              creative.fileUrl ?? null,

            thumbnail_url:
              creative.thumbnailUrl ?? null,

            optimized_url:
              creative.optimizedUrl ?? null,

            width:
              creative.width != null
                ? Number(creative.width)
                : null,

            height:
              creative.height != null
                ? Number(creative.height)
                : null,

            file_size:
              creative.fileSize != null
                ? Number(creative.fileSize)
                : null,

            mime_type:
              creative.mimeType ?? null,

            sprint_id: sprintId,

            team_id:
              sprintId != null
                ? sprintTeamMap.get(sprintId) ?? null
                : null,

            metadata:
              creative.metadata ?? null,

            tags:
              creative.tags ?? null,

            visual_analysis:
              creative.visualAnalysis ?? null,

            visual_analysis_date:
              creative.visualAnalysisDate ?? null,

            created_at:
              creative.createdAt ?? null,

            updated_at:
              creative.updatedAt ?? null,

            synced_at: now,
          };
        });

      if (rows.length > 0) {
        const { error: upsertError } =
          await supabaseAdmin
            .from("creatives")
            .upsert(rows, {
              onConflict: "id",
            });

        if (upsertError) {
          throw new Error(
            `Creative upsert failed on page ${page}: ` +
              upsertError.message
          );
        }

        upserted += rows.length;
      }
    }

    const finishedAt = new Date().toISOString();

    const { error: stateError } =
      await supabaseAdmin
        .from("sync_state")
        .upsert(
          {
            source: "nordace_creatives_incremental",
            status: "completed",
            total_records: checked,
            synced_records: upserted,
            last_started_at: finishedAt,
            last_completed_at: finishedAt,
            last_error: null,
            updated_at: finishedAt,
          },
          {
            onConflict: "source",
          }
        );

    if (stateError) {
      throw new Error(
        `Failed updating cron sync state: ${stateError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      checked,
      upserted,
      pagesChecked: PAGES_TO_CHECK,
      message: "Incremental creative sync completed",
      timestamp: finishedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Cron creative sync error:",
      message
    );

    try {
      await supabaseAdmin
        .from("sync_state")
        .upsert(
          {
            source: "nordace_creatives_incremental",
            status: "error",
            last_error: message,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "source",
          }
        );
    } catch (stateError) {
      console.error(
        "Failed writing cron error state:",
        stateError
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return runCreativeSync(request);
}

export async function POST(request: NextRequest) {
  return runCreativeSync(request);
}