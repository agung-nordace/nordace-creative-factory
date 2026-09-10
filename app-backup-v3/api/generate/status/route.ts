import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ATLAS_BASE_URL =
  process.env.ATLAS_API_BASE_URL || "https://api.atlascloud.ai/api/v1";

function extractStatus(payload: any) {
  return String(
    payload?.status ??
      payload?.data?.status ??
      payload?.prediction?.status ??
      ""
  ).toLowerCase();
}

function extractOutputUrls(payload: any): string[] {
  const candidates = [
    payload?.outputs,
    payload?.output,
    payload?.data?.outputs,
    payload?.data?.output,
    payload?.prediction?.outputs,
    payload?.prediction?.output,
  ];

  const urls: string[] = [];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const value of candidate) {
        if (typeof value === "string" && value.trim()) {
          urls.push(value.trim());
        } else if (value && typeof value === "object") {
          const url = value.url || value.src || value.image_url;
          if (typeof url === "string" && url.trim()) {
            urls.push(url.trim());
          }
        }
      }
    } else if (typeof candidate === "string" && candidate.trim()) {
      urls.push(candidate.trim());
    }
  }

  return Array.from(new Set(urls));
}

function isComplete(status: string) {
  return [
    "completed",
    "complete",
    "succeeded",
    "success",
    "finished",
    "done",
  ].includes(status);
}

function isFailed(status: string) {
  return [
    "failed",
    "error",
    "cancelled",
    "canceled",
  ].includes(status);
}

export async function GET(request: NextRequest) {
  try {
    const atlasKey = process.env.ATLAS_API_KEY;

    if (!atlasKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing ATLAS_API_KEY in .env.local",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const runIdRaw = searchParams.get("run_id");

    const runId =
      runIdRaw && Number.isFinite(Number(runIdRaw))
        ? Number(runIdRaw)
        : null;

    if (!runId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing run_id",
        },
        { status: 400 }
      );
    }

    const { data: run, error: runError } = await supabaseAdmin
      .from("generation_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        {
          success: false,
          error: "Generation run not found",
        },
        { status: 404 }
      );
    }

    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from("generation_jobs")
      .select("*")
      .eq("run_id", runId)
      .order("job_index", { ascending: true });

    if (jobsError) {
      throw new Error(jobsError.message);
    }

    for (const job of jobs ?? []) {
      if (job.status !== "processing" || !job.prediction_id) {
        continue;
      }

      try {
        const response = await fetch(
          `${ATLAS_BASE_URL.replace(/\/+$/, "")}/model/prediction/${encodeURIComponent(job.prediction_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${atlasKey}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const text = await response.text();

        let payload: any = {};

        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          payload = { raw: text };
        }

        if (!response.ok) {
          continue;
        }

        const providerStatus = extractStatus(payload);
        const outputUrls = extractOutputUrls(payload);

        if (isComplete(providerStatus) || outputUrls.length > 0) {
          await supabaseAdmin
            .from("generation_jobs")
            .update({
              status: "completed",
              provider_response: payload,
              output_url: outputUrls[0] ?? null,
              output_urls: outputUrls,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        } else if (isFailed(providerStatus)) {
          await supabaseAdmin
            .from("generation_jobs")
            .update({
              status: "failed",
              provider_response: payload,
              error:
                payload?.error?.message ||
                payload?.message ||
                `Provider status: ${providerStatus}`,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        } else {
          await supabaseAdmin
            .from("generation_jobs")
            .update({
              provider_response: payload,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        }
      } catch (error) {
        console.warn(
          `Could not poll Atlas prediction ${job.prediction_id}:`,
          error
        );
      }
    }

    const { data: refreshedJobs, error: refreshError } =
      await supabaseAdmin
        .from("generation_jobs")
        .select("*")
        .eq("run_id", runId)
        .order("job_index", { ascending: true });

    if (refreshError) {
      throw new Error(refreshError.message);
    }

    const completedJobs =
      refreshedJobs?.filter((job) => job.status === "completed").length ?? 0;

    const failedJobs =
      refreshedJobs?.filter((job) => job.status === "failed").length ?? 0;

    const processingJobs =
      refreshedJobs?.filter((job) =>
        ["queued", "submitting", "processing"].includes(job.status)
      ).length ?? 0;

    const finalStatus =
      processingJobs > 0
        ? "processing"
        : failedJobs > 0 && completedJobs === 0
          ? "failed"
          : completedJobs + failedJobs >= (run.total_jobs ?? 0)
            ? "completed"
            : run.status;

    await supabaseAdmin
      .from("generation_runs")
      .update({
        status: finalStatus,
        completed_jobs: completedJobs,
        failed_jobs: failedJobs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return NextResponse.json({
      success: true,
      run: {
        ...run,
        status: finalStatus,
        completed_jobs: completedJobs,
        failed_jobs: failedJobs,
      },
      jobs: refreshedJobs ?? [],
      progress: {
        total: run.total_jobs ?? refreshedJobs?.length ?? 0,
        completed: completedJobs,
        failed: failedJobs,
        processing: processingJobs,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Generation status error:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
