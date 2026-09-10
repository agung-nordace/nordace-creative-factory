import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get("search") || "").trim();
    const productKey = String(searchParams.get("product_key") || "").trim();
    const assetIdRaw = searchParams.get("asset_id");
    const assetId =
      assetIdRaw && Number.isFinite(Number(assetIdRaw))
        ? Number(assetIdRaw)
        : null;

    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 50))
    );

    let query = supabaseAdmin
      .from("generated_creatives")
      .select("*")
      .eq("status", "active");

    if (assetId) {
      query = query.eq("id", assetId);
    }

    if (productKey) {
      query = query.contains("product_keys", [productKey]);
    }

    query = query
      .order("created_at", { ascending: false })
      .limit(assetId ? 1 : limit);

    if (search) {
      query = query.or(
        [
          `title.ilike.%${search}%`,
          `creative_model_name.ilike.%${search}%`,
          `archetype_name.ilike.%${search}%`,
          `concept_name.ilike.%${search}%`,
          `product_summary.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const generationJobId = Number(body?.generation_job_id);
    const generationRunId = Number(body?.generation_run_id);
    const imageUrl = String(body?.image_url || "").trim();

    if (
      !Number.isFinite(generationJobId) ||
      !Number.isFinite(generationRunId) ||
      !imageUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "generation_job_id, generation_run_id and image_url are required.",
        },
        { status: 400 }
      );
    }

    const row = {
      generation_job_id: generationJobId,
      generation_run_id: generationRunId,
      title: body?.title != null ? String(body.title) : null,
      creative_model_id:
        body?.creative_model_id != null
          ? String(body.creative_model_id)
          : null,
      creative_model_name:
        body?.creative_model_name != null
          ? String(body.creative_model_name)
          : null,
      archetype_name:
        body?.archetype_name != null
          ? String(body.archetype_name)
          : null,
      concept_name:
        body?.concept_name != null
          ? String(body.concept_name)
          : null,
      ratio: body?.ratio != null ? String(body.ratio) : null,
      product_summary:
        body?.product_summary != null
          ? String(body.product_summary)
          : null,

      product_keys:
        Array.isArray(body?.product_keys)
          ? body.product_keys.map((value: unknown) => String(value)).filter(Boolean)
          : [],

      product_names:
        Array.isArray(body?.product_names)
          ? body.product_names.map((value: unknown) => String(value)).filter(Boolean)
          : [],

      product_skus:
        Array.isArray(body?.product_skus)
          ? body.product_skus.map((value: unknown) => String(value)).filter(Boolean)
          : [],

            image_url: imageUrl,
      prompt: body?.prompt != null ? String(body.prompt) : null,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? body.metadata
          : {},
      status: "active",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("generated_creatives")
      .upsert(row, {
        onConflict: "generation_job_id",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      asset: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
