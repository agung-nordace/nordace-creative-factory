import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const PAGES_PER_RUN = 10;

type CreativeRow = {
  id: number;
  name: string;
  description: string | null;
  type: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  optimized_url: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  mime_type: string | null;
  sprint_id: number | null;
  team_id: number | null;
  metadata: any;
  tags: any;
  visual_analysis: any;
  visual_analysis_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  synced_at: string;
};

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));

    const forceStartPage =
      typeof body?.startPage === "number" && body.startPage > 0
        ? body.startPage
        : null;

    const now = new Date().toISOString();

    // =========================================================
    // 1. READ CURRENT SYNC STATE
    // =========================================================

    const { data: syncState, error: syncStateError } =
      await supabaseAdmin
        .from("sync_state")
        .select("*")
        .eq("source", "nordace_creatives")
        .single();

    if (syncStateError) {
      throw new Error(
        `Failed reading sync state: ${syncStateError.message}`
      );
    }

    const startPage =
      forceStartPage ??
      Math.max(Number(syncState?.current_page ?? 0) + 1, 1);

    if (
      syncState?.status === "completed" &&
      !forceStartPage
    ) {
      return NextResponse.json({
        success: true,
        completed: true,
        message: "Creative sync already completed",
        currentPage: syncState.current_page,
        totalPages: syncState.total_pages,
        totalRecords: syncState.total_records,
        syncedRecords: syncState.synced_records,
      });
    }

    // =========================================================
    // 2. MARK SYNC RUNNING
    // =========================================================

    const { error: runningStateError } =
      await supabaseAdmin
        .from("sync_state")
        .upsert(
          {
            source: "nordace_creatives",
            status: "running",
            last_started_at: now,
            last_error: null,
            updated_at: now,
          },
          {
            onConflict: "source",
          }
        );

    if (runningStateError) {
      throw new Error(
        `Failed updating sync state: ${runningStateError.message}`
      );
    }

    let totalPages =
      Number(syncState?.total_pages ?? 0) || null;

    let totalRecords =
      Number(syncState?.total_records ?? 0) || 0;

    let syncedThisRun = 0;
    let lastPageProcessed = startPage - 1;

    // =========================================================
    // 3. PROCESS PAGES
    // =========================================================

    for (
      let pageOffset = 0;
      pageOffset < PAGES_PER_RUN;
      pageOffset++
    ) {
      const currentPage = startPage + pageOffset;

      if (totalPages && currentPage > totalPages) {
        break;
      }

      const apiUrl =
        `${baseUrl}/api/v1/sync/creatives` +
        `?page=${currentPage}&limit=${PAGE_SIZE}`;

      const response = await fetch(apiUrl, {
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
          `Nordace creative fetch failed on page ${currentPage}: ${response.status} ${details}`
        );
      }

      const payload = await response.json();

      const creatives: any[] = Array.isArray(payload?.data)
        ? payload.data
        : [];

      const pagination = payload?.pagination ?? {};

      totalPages =
        Number(pagination?.pages ?? totalPages ?? 1);

      totalRecords =
        Number(pagination?.total ?? totalRecords ?? 0);

      // =======================================================
      // 4. MAP RAW CREATIVE DATA
      // =======================================================

      const rows: CreativeRow[] = creatives
        .filter((creative: any) => creative?.id != null)
        .map((creative: any): CreativeRow => {
          const possibleSprintId =
            creative?.team?.id != null
              ? Number(creative.team.id)
              : null;

          return {
            id: Number(creative.id),

            name: String(
              creative.name ?? `Creative ${creative.id}`
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

            sprint_id:
              possibleSprintId,

            team_id:
              null,

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

            synced_at:
              new Date().toISOString(),
          };
        });

      // =======================================================
      // 5. RESOLVE VALID SPRINT IDS
      // =======================================================

      const requestedSprintIds = Array.from(
        new Set<number>(
          rows
            .map((row: CreativeRow): number | null => row.sprint_id)
            .filter(
              (id: number | null): id is number =>
                id !== null && Number.isFinite(id)
            )
        )
      );

      const validSprintIds = new Set<number>();

      const sprintTeamMap =
        new Map<number, number | null>();

      if (requestedSprintIds.length > 0) {
        const {
          data: sprintRows,
          error: sprintError,
        } = await supabaseAdmin
          .from("sprints")
          .select("id, team_id")
          .in("id", requestedSprintIds);

        if (sprintError) {
          throw new Error(
            `Failed resolving sprint teams: ${sprintError.message}`
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

      // =======================================================
      // 6. BUILD FINAL SAFE ROWS
      // =======================================================

      const finalRows: CreativeRow[] = rows.map(
        (row: CreativeRow): CreativeRow => {
          const rawSprintId = row.sprint_id;

          const validSprintId =
            rawSprintId != null &&
            validSprintIds.has(rawSprintId)
              ? rawSprintId
              : null;

          const resolvedTeamId =
            validSprintId != null
              ? sprintTeamMap.get(validSprintId) ?? null
              : null;

          return {
            ...row,
            sprint_id: validSprintId,
            team_id: resolvedTeamId,
          };
        }
      );

      const invalidSprintCount = rows.filter(
        (row: CreativeRow) =>
          row.sprint_id != null &&
          !validSprintIds.has(row.sprint_id)
      ).length;

      if (invalidSprintCount > 0) {
        console.log(
          `Page ${currentPage}: ${invalidSprintCount} creatives have non-sprint legacy assignments`
        );
      }

      // =======================================================
      // 7. UPSERT INTO SUPABASE
      // =======================================================

      if (finalRows.length > 0) {
        const { error: upsertError } =
          await supabaseAdmin
            .from("creatives")
            .upsert(finalRows, {
              onConflict: "id",
            });

        if (upsertError) {
          throw new Error(
            `Creative upsert failed on page ${currentPage}: ${upsertError.message}`
          );
        }
      }

      syncedThisRun += finalRows.length;
      lastPageProcessed = currentPage;

      // =======================================================
      // 8. SAVE PROGRESS
      // =======================================================

      const { error: progressError } =
        await supabaseAdmin
          .from("sync_state")
          .upsert(
            {
              source: "nordace_creatives",
              status: "running",
              current_page: currentPage,
              total_pages: totalPages,
              total_records: totalRecords,
              synced_records:
                Number(syncState?.synced_records ?? 0) +
                syncedThisRun,
              last_error: null,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "source",
            }
          );

      if (progressError) {
        throw new Error(
          `Failed saving sync progress: ${progressError.message}`
        );
      }

      if (
        totalPages != null &&
        currentPage >= totalPages
      ) {
        break;
      }
    }

    // =========================================================
    // 9. FINALIZE
    // =========================================================

    const completed =
      totalPages != null &&
      lastPageProcessed >= totalPages;

    const finalStatus =
      completed ? "completed" : "idle";

    const completedAt =
      completed
        ? new Date().toISOString()
        : null;

    const { error: finalStateError } =
      await supabaseAdmin
        .from("sync_state")
        .upsert(
          {
            source: "nordace_creatives",
            status: finalStatus,
            current_page: lastPageProcessed,
            total_pages: totalPages,
            total_records: totalRecords,
            synced_records:
              Number(syncState?.synced_records ?? 0) +
              syncedThisRun,
            last_completed_at: completedAt,
            last_error: null,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "source",
          }
        );

    if (finalStateError) {
      throw new Error(
        `Failed finalizing sync state: ${finalStateError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      completed,
      status: finalStatus,

      startPage,
      endPage: lastPageProcessed,

      pagesProcessed:
        lastPageProcessed >= startPage
          ? lastPageProcessed - startPage + 1
          : 0,

      syncedThisRun,
      totalPages,
      totalRecords,

      nextPage:
        completed
          ? null
          : lastPageProcessed + 1,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Creative sync error:",
      message
    );

    await supabaseAdmin
      .from("sync_state")
      .upsert(
        {
          source: "nordace_creatives",
          status: "error",
          last_error: message,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "source",
        }
      );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}