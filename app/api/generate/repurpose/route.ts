import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ATLAS_BASE_URL =
  process.env.ATLAS_API_BASE_URL || "https://api.atlascloud.ai/api/v1";

const ATLAS_IMAGE_MODEL =
  process.env.ATLAS_IMAGE_MODEL || "openai/gpt-image-2.5-flare/edit";

const ATLAS_IMAGE_QUALITY =
  process.env.ATLAS_IMAGE_QUALITY || "high";

const SIZE_BY_RATIO: Record<string, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1280",
  "1.91:1": "1536x804",
  "9:16": "1024x1792",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueUrls(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => clean(value)).filter(Boolean))
  );
}

function extractPredictionId(payload: any): string | null {
  const candidates = [
    payload?.id,
    payload?.prediction_id,
    payload?.predictionId,
    payload?.task_id,
    payload?.taskId,
    payload?.data?.id,
    payload?.data?.prediction_id,
    payload?.data?.predictionId,
    payload?.data?.task_id,
    payload?.data?.taskId,
    payload?.prediction?.id,
  ];

  for (const value of candidates) {
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return null;
}

function describeFetchError(error: unknown) {
  if (!(error instanceof Error)) return String(error);

  const cause = (error as Error & {
    cause?: {
      code?: string;
      syscall?: string;
      hostname?: string;
      message?: string;
    };
  }).cause;

  const parts = [error.message];

  if (cause?.code) parts.push(`code=${cause.code}`);
  if (cause?.syscall) parts.push(`syscall=${cause.syscall}`);
  if (cause?.hostname) parts.push(`host=${cause.hostname}`);
  if (cause?.message && cause.message !== error.message) {
    parts.push(`cause=${cause.message}`);
  }

  return parts.join(" | ");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitToAtlas(args: {
  url: string;
  apiKey: string;
  payload: Record<string, unknown>;
}) {
  const attempts = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(args.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.apiKey}`,
          Accept: "application/json",
        },
        body: JSON.stringify(args.payload),
        cache: "no-store",
        signal: controller.signal,
      });

      const responseText = await response.text();

      let responsePayload: any = {};
      try {
        responsePayload = responseText ? JSON.parse(responseText) : {};
      } catch {
        responsePayload = { raw: responseText };
      }

      if (!response.ok) {
        const message =
          `AtlasCloud HTTP ${response.status}: ` +
          responseText.slice(0, 1500);

        if ([400, 401, 403, 422].includes(response.status)) {
          throw new Error(message);
        }

        lastError = message;
      } else {
        return { responseText, responsePayload };
      }
    } catch (error) {
      lastError = describeFetchError(error);

      if (
        error instanceof Error &&
        (
          error.message.startsWith("AtlasCloud HTTP 400") ||
          error.message.startsWith("AtlasCloud HTTP 401") ||
          error.message.startsWith("AtlasCloud HTTP 403") ||
          error.message.startsWith("AtlasCloud HTTP 422")
        )
      ) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < attempts) {
      await sleep(1200 * attempt);
    }
  }

  throw new Error(
    `AtlasCloud repurpose submission failed after ${attempts} attempts. ${lastError}`
  );
}

function buildRepurposePrompt(args: {
  sourceRatio: string | null;
  targetRatio: string;
  designerPlan: any;
  originalPrompt: string | null;
}) {
  const subjectContract =
    args.designerPlan?.subjectContract ||
    args.designerPlan?.requiredSubjectCount
      ? `Preserve the exact original product-subject count and every selected product/color exactly.`
      : `Preserve every commercial product visible in the source creative exactly.`;

  const archetype =
    args.designerPlan?.archetypeName ||
    args.designerPlan?.conceptName ||
    "the original creative concept";

  return `
REPURPOSE THIS EXISTING FINISHED AD CREATIVE TO A NEW ASPECT RATIO.

SOURCE CREATIVE
The FIRST reference image is the approved finished creative.
It is the absolute source of truth for:
- campaign concept
- exact on-image copy
- typography wording
- product identity
- product colors
- visual hierarchy
- graphic language
- overall art direction

TARGET
Recompose the approved creative from ${args.sourceRatio || "its current ratio"} to ${args.targetRatio}.

NON-NEGOTIABLE COPY LOCK
Preserve ALL visible copy from the source creative EXACTLY.
Do not rewrite.
Do not paraphrase.
Do not invent new copy.
Do not drop important text.
Do not introduce typos.
Do not change numbers, percentages, punctuation, claims or offer wording.

NON-NEGOTIABLE PRODUCT LOCK
${subjectContract}
The supporting product-reference images after the source creative are authoritative for product shape, color, handles, materials, stitching, zippers, trim, hardware, logo/patch placement and distinctive details.
Do not redesign, merge, duplicate, recolor, omit or substitute selected products.

DESIGN ADAPTATION
This is NOT a crop and NOT a stretch.
Professionally reflow the composition for ${args.targetRatio}.
Preserve the same campaign idea and the same archetype: ${archetype}.
Move and resize elements intelligently so the result looks intentionally designed for the target format.
Maintain clean safe margins.
Keep typography readable.
Do not let text cover critical product details, faces, handles, logos, hardware or product silhouettes.
Do not create awkward empty bands.
Do not simply center everything.
Maintain strong graphic-design hierarchy and balanced negative space.

REFERENCE PRIORITY
1. Source finished creative = composition/copy/art-direction authority.
2. Supporting product reference images = product-fidelity authority.
3. Original generation brief below = context only, never override the approved source creative.

ORIGINAL BRIEF CONTEXT
${args.originalPrompt || "No original prompt available."}

FINAL QA
Before finalizing, verify:
- exact copy preserved with no typo
- exact product count preserved
- every product/color still correct
- no accidental duplicate product
- no cropped critical text
- no text-product collision
- no stretched/distorted product
- composition genuinely adapted to ${args.targetRatio}
- result looks like a professional native creative for this aspect ratio

Return ONE finished final ad creative.
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ATLAS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "ATLAS_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const assetId = Number(body?.asset_id);
    const requestedRatios = Array.isArray(body?.ratios)
      ? body.ratios.map((value: unknown) => String(value))
      : [];

    const ratios = Array.from(
      new Set(
        requestedRatios.filter((ratio: string) =>
          Object.prototype.hasOwnProperty.call(SIZE_BY_RATIO, ratio)
        )
      )
    );

    if (!Number.isFinite(assetId)) {
      return NextResponse.json(
        { success: false, error: "Missing asset_id." },
        { status: 400 }
      );
    }

    if (!ratios.length) {
      return NextResponse.json(
        { success: false, error: "Select at least one target ratio." },
        { status: 400 }
      );
    }

    const { data: asset, error: assetError } =
      await supabaseAdmin
        .from("generated_creatives")
        .select("*")
        .eq("id", assetId)
        .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { success: false, error: "Generated creative asset not found." },
        { status: 404 }
      );
    }

    const { data: sourceJob } =
      await supabaseAdmin
        .from("generation_jobs")
        .select("*")
        .eq("id", asset.generation_job_id)
        .single();

    const designerPlan =
      sourceJob?.provider_request?._designer_plan ||
      asset?.metadata?.designer_plan ||
      {};

    const productReferences = Array.isArray(sourceJob?.product_references)
      ? sourceJob.product_references
      : [];

    const supportingProductUrls = uniqueUrls(
      productReferences.flatMap((group: any) =>
        Array.isArray(group?.references) ? group.references : []
      )
    );

    // First image is ALWAYS the approved finished creative.
    // Remaining slots reinforce exact product fidelity.
    const referenceImages = uniqueUrls([
      asset.image_url,
      ...supportingProductUrls,
    ]).slice(0, 16);

    const now = new Date().toISOString();

    const { data: run, error: runError } =
      await supabaseAdmin
        .from("generation_runs")
        .insert({
          status: "submitting",
          output_count: ratios.length,
          ratio: "multi",
          provider: "atlascloud",
          model: ATLAS_IMAGE_MODEL,
          landing_page: sourceJob?.landing_page_context ?? null,
          winning_creative: sourceJob?.winning_reference ?? null,
          products: sourceJob?.product_references ?? [],
          creative_models: [
            {
              id: sourceJob?.creative_model_id || "repurpose",
              name: sourceJob?.creative_model_name || "Repurpose",
            },
          ],
          creative_direction:
            `Repurpose generated asset #${asset.id} into ${ratios.join(", ")}`,
          total_jobs: ratios.length,
          completed_jobs: 0,
          failed_jobs: 0,
          updated_at: now,
        })
        .select("*")
        .single();

    if (runError || !run) {
      throw new Error(
        `Could not create repurpose run: ${runError?.message || "unknown error"}`
      );
    }

    let failed = 0;
    const submitted: any[] = [];

    for (let index = 0; index < ratios.length; index++) {
      const targetRatio = ratios[index];
      const size = SIZE_BY_RATIO[targetRatio];

      const prompt = buildRepurposePrompt({
        sourceRatio: asset.ratio || sourceJob?.ratio || null,
        targetRatio,
        designerPlan,
        originalPrompt: asset.prompt || sourceJob?.prompt || null,
      });

      const atlasRequest = {
        model: ATLAS_IMAGE_MODEL,
        images: referenceImages,
        prompt,
        quality: ATLAS_IMAGE_QUALITY,
        size,
        background: "auto",
        output_format: "png",
        moderation: "auto",
        n: 1,
        enable_sync_mode: false,
        enable_base64_output: false,
      };

      const { data: job, error: jobError } =
        await supabaseAdmin
          .from("generation_jobs")
          .insert({
            run_id: run.id,
            job_index: index,
            status: "submitting",
            provider: "atlascloud",
            model: ATLAS_IMAGE_MODEL,
            creative_model_id: sourceJob?.creative_model_id || "repurpose",
            creative_model_name:
              `${sourceJob?.creative_model_name || "Creative"} · Repurpose ${targetRatio}`,
            prompt,
            ratio: targetRatio,
            size,
            product_references: sourceJob?.product_references ?? [],
            winning_reference: sourceJob?.winning_reference ?? null,
            landing_page_context: sourceJob?.landing_page_context ?? null,
            provider_request: {
              ...atlasRequest,
              _designer_plan: {
                ...designerPlan,
                engineVersion: "repurpose-v1",
                sourceAssetId: asset.id,
                sourceGenerationJobId: asset.generation_job_id,
                sourceGenerationRunId: asset.generation_run_id,
                sourceRatio: asset.ratio || sourceJob?.ratio || null,
                targetRatio,
                operation: "repurpose_size",
                textRenderMode: "native_in_image",
              },
            },
            rendered_text: null,
            typography_status: "native_render",
            started_at: now,
            updated_at: now,
          })
          .select("*")
          .single();

      if (jobError || !job) {
        failed++;
        continue;
      }

      try {
        const atlas = await submitToAtlas({
          url: `${ATLAS_BASE_URL.replace(/\/+$/, "")}/model/generateImage`,
          apiKey,
          payload: atlasRequest,
        });

        const predictionId = extractPredictionId(atlas.responsePayload);

        if (!predictionId) {
          throw new Error(
            `AtlasCloud returned no prediction ID: ${atlas.responseText.slice(0, 1000)}`
          );
        }

        await supabaseAdmin
          .from("generation_jobs")
          .update({
            status: "processing",
            prediction_id: predictionId,
            provider_response: atlas.responsePayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        submitted.push({
          id: job.id,
          ratio: targetRatio,
          predictionId,
        });
      } catch (error) {
        failed++;

        await supabaseAdmin
          .from("generation_jobs")
          .update({
            status: "failed",
            error:
              error instanceof Error
                ? error.message
                : String(error),
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }
    }

    await supabaseAdmin
      .from("generation_runs")
      .update({
        status: submitted.length ? "processing" : "failed",
        failed_jobs: failed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json({
      success: submitted.length > 0,
      runId: run.id,
      sourceAssetId: asset.id,
      totalJobs: ratios.length,
      submittedJobs: submitted.length,
      failedSubmissions: failed,
      jobs: submitted,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Repurpose API error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
