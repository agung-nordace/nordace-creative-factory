import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(searchParams.get("limit") || 50)
      )
    );

    const { data: runs, error: runsError } =
      await supabaseAdmin
        .from("generation_runs")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(limit);

    if (runsError) {
      throw new Error(runsError.message);
    }

    const runIds = (runs || [])
      .map((run: any) => Number(run.id))
      .filter(Number.isFinite);

    let jobs: any[] = [];

    if (runIds.length > 0) {
      const { data, error } =
        await supabaseAdmin
          .from("generation_jobs")
          .select(
            "id,run_id,job_index,status,creative_model_id,creative_model_name,ratio,size,output_url,error,created_at,started_at,completed_at"
          )
          .in("run_id", runIds)
          .order("job_index", {
            ascending: true,
          });

      if (error) {
        throw new Error(error.message);
      }

      jobs = data || [];
    }

    const jobsByRun = new Map<number, any[]>();

    for (const job of jobs) {
      const runId = Number(job.run_id);

      if (!jobsByRun.has(runId)) {
        jobsByRun.set(runId, []);
      }

      jobsByRun.get(runId)!.push(job);
    }

    const data = (runs || []).map((run: any) => ({
      ...run,
      jobs: jobsByRun.get(Number(run.id)) || [],
    }));

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
