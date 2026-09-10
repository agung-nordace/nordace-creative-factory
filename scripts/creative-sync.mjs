import { createClient } from "@supabase/supabase-js";

const API_BASE_URL = process.env.ND_API_BASE_URL;
const API_TOKEN = process.env.ND_API_TOKEN;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const PAGE_SIZE = 100;
const PAGES_TO_CHECK = 5;

if (!API_BASE_URL) {
  throw new Error("Missing ND_API_BASE_URL");
}

if (!API_TOKEN) {
  throw new Error("Missing ND_API_TOKEN");
}

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL");
}

if (!SUPABASE_SECRET_KEY) {
  throw new Error("Missing SUPABASE_SECRET_KEY");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function main() {
  console.log("Starting Nordace incremental creative sync...");
  console.log(`Checking newest ${PAGES_TO_CHECK} pages`);

  let checked = 0;
  let upserted = 0;

  for (let page = 1; page <= PAGES_TO_CHECK; page++) {
    const url =
      `${API_BASE_URL}/api/v1/sync/creatives` +
      `?page=${page}&limit=${PAGE_SIZE}`;

    console.log(`Fetching page ${page}...`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
        "User-Agent": "Nordace-Creative-Factory-Sync/1.0",
      },
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Nordace API page ${page} failed: ${response.status}\n` +
        body.slice(0, 500)
      );
    }

    const payload = await response.json();

    const creatives = Array.isArray(payload?.data)
      ? payload.data
      : [];

    console.log(
      `Page ${page}: received ${creatives.length} creatives`
    );

    checked += creatives.length;

    const candidateSprintIds = [
      ...new Set(
        creatives
          .map((creative) => {
            if (creative?.team?.id == null) {
              return null;
            }

            const id = Number(creative.team.id);

            return Number.isFinite(id) ? id : null;
          })
          .filter((id) => id !== null)
      ),
    ];

    const validSprintIds = new Set();
    const sprintTeamMap = new Map();

    if (candidateSprintIds.length > 0) {
      const { data: sprintRows, error: sprintError } =
        await supabase
          .from("sprints")
          .select("id, team_id")
          .in("id", candidateSprintIds);

      if (sprintError) {
        throw new Error(
          `Supabase sprint lookup failed: ${sprintError.message}`
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

    const syncedAt = new Date().toISOString();

    const rows = creatives
      .filter((creative) => creative?.id != null)
      .map((creative) => {
        const possibleSprintId =
          creative?.team?.id != null
            ? Number(creative.team.id)
            : null;

        const sprintId =
          possibleSprintId != null &&
          validSprintIds.has(possibleSprintId)
            ? possibleSprintId
            : null;

        return {
          id: Number(creative.id),

          name: String(
            creative.name ?? `Creative ${creative.id}`
          ),

          description: creative.description ?? null,

          type: creative.type ?? null,

          file_url: creative.fileUrl ?? null,

          thumbnail_url: creative.thumbnailUrl ?? null,

          optimized_url: creative.optimizedUrl ?? null,

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

          mime_type: creative.mimeType ?? null,

          sprint_id: sprintId,

          team_id:
            sprintId != null
              ? sprintTeamMap.get(sprintId) ?? null
              : null,

          metadata: creative.metadata ?? null,

          tags: creative.tags ?? null,

          visual_analysis:
            creative.visualAnalysis ?? null,

          visual_analysis_date:
            creative.visualAnalysisDate ?? null,

          created_at: creative.createdAt ?? null,

          updated_at: creative.updatedAt ?? null,

          synced_at: syncedAt,
        };
      });

    if (rows.length > 0) {
      const { error: upsertError } =
        await supabase
          .from("creatives")
          .upsert(rows, {
            onConflict: "id",
          });

      if (upsertError) {
        throw new Error(
          `Supabase creative upsert failed: ${upsertError.message}`
        );
      }

      upserted += rows.length;
    }

    console.log(
      `Page ${page} completed: ${rows.length} rows upserted`
    );
  }

  const finishedAt = new Date().toISOString();

  const { error: stateError } =
    await supabase
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
    console.warn(
      "Could not update sync_state:",
      stateError.message
    );
  }

  console.log("");
  console.log("=================================");
  console.log("SYNC COMPLETED");
  console.log("=================================");
  console.log(`Checked:  ${checked}`);
  console.log(`Upserted: ${upserted}`);
  console.log(`Pages:    ${PAGES_TO_CHECK}`);
  console.log(`Time:     ${finishedAt}`);
}

main().catch(async (error) => {
  console.error("");
  console.error("SYNC FAILED");
  console.error(error);

  try {
    await supabase
      .from("sync_state")
      .upsert(
        {
          source: "nordace_creatives_incremental",
          status: "error",
          last_error:
            error instanceof Error
              ? error.message
              : String(error),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "source",
        }
      );
  } catch {}

  process.exit(1);
});