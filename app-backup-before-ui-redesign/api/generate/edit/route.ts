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
    `AtlasCloud edit submission failed after ${attempts} attempts. ${lastError}`
  );
}

function buildEditPrompt(args: {
  instruction: string;
  designerPlan: any;
  originalPrompt: string | null;
  ratio: string;
}) {
  const subjectCount =
    Number(args.designerPlan?.requiredSubjectCount ?? 0) || null;

  return `
EDIT THE APPROVED FINISHED AD CREATIVE ACCORDING TO THE USER'S REVISION INSTRUCTION.

USER REVISION INSTRUCTION
${args.instruction}

SOURCE CREATIVE
The FIRST reference image is the approved finished creative and is the primary composition reference.

STRICT CHANGE CONTROL
Change ONLY what is necessary to satisfy the user's revision instruction.
Preserve everything else unless the requested change requires a local adjustment.

PRODUCT LOCK
${subjectCount ? `The final creative must still contain exactly ${subjectCount} selected commercial product subject${subjectCount === 1 ? "" : "s"}.` : "Preserve the same commercial product count as the source creative."}
Supporting product reference images after the source image are authoritative for:
- shape and proportions
- exact selected color(s)
- material
- handles
- stitching
- zippers
- trim
- hardware
- logo / patch placement
- distinctive product details

Never invent, merge, omit, duplicate, recolor or substitute the selected product(s) unless the user's instruction explicitly requests a product/color change and a corresponding authoritative product reference is present.

COPY / TYPOGRAPHY LOCK
If the user did NOT request a text change:
- preserve existing visible copy exactly
- preserve spelling, numbers, punctuation and offer wording
- do not add extra copy
- do not delete copy

If the user DID request a text change:
- use the requested replacement wording exactly
- do not paraphrase it
- do not introduce typos
- maintain professional hierarchy and spacing
- keep text readable and inside safe margins
- do not cover critical product details or faces

DESIGN QUALITY
Maintain the original campaign concept, archetype and graphic-design quality unless the user explicitly asks to change them.
Avoid generic AI-ad styling.
Do not turn the output into a template.
Keep intentional hierarchy, negative space, balance, alignment and commercial polish.

OUTPUT
Keep aspect ratio ${args.ratio}.
Return ONE finished edited ad creative.

ORIGINAL DESIGNER CONTEXT
${args.originalPrompt || "No original prompt available."}

FINAL QA BEFORE RETURNING
- revision instruction satisfied
- no unrelated changes
- exact product count preserved
- selected product/color fidelity preserved
- no accidental duplicate products
- no malformed handles/hardware
- no typo
- no cropped important text
- no text covering important product details
- professional graphic-design composition
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
    const instruction = clean(body?.instruction);

    if (!Number.isFinite(assetId)) {
      return NextResponse.json(
        { success: false, error: "Missing asset_id." },
        { status: 400 }
      );
    }

    if (!instruction) {
      return NextResponse.json(
        { success: false, error: "Write an edit instruction first." },
        { status: 400 }
      );
    }

    if (instruction.length > 3000) {
      return NextResponse.json(
        {
          success: false,
          error: "Edit instruction is too long. Keep it under 3000 characters.",
        },
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

    const ratio =
      clean(asset.ratio) ||
      clean(sourceJob?.ratio) ||
      "1:1";

    const size =
      SIZE_BY_RATIO[ratio] ||
      SIZE_BY_RATIO["1:1"];

    const productReferences = Array.isArray(sourceJob?.product_references)
      ? sourceJob.product_references
      : [];

    const supportingProductUrls = uniqueUrls(
      productReferences.flatMap((group: any) =>
        Array.isArray(group?.references) ? group.references : []
      )
    );

    // Approved creative first, then authoritative product references.
    const referenceImages = uniqueUrls([
      asset.image_url,
      ...supportingProductUrls,
    ]).slice(0, 16);

    const prompt = buildEditPrompt({
      instruction,
      designerPlan,
      originalPrompt: asset.prompt || sourceJob?.prompt || null,
      ratio,
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

    const now = new Date().toISOString();

    const { data: run, error: runError } =
      await supabaseAdmin
        .from("generation_runs")
        .insert({
          status: "submitting",
          output_count: 1,
          ratio,
          provider: "atlascloud",
          model: ATLAS_IMAGE_MODEL,
          landing_page: sourceJob?.landing_page_context ?? null,
          winning_creative: sourceJob?.winning_reference ?? null,
          products: sourceJob?.product_references ?? [],
          creative_models: [
            {
              id: sourceJob?.creative_model_id || "edit",
              name: sourceJob?.creative_model_name || "Creative Edit",
            },
          ],
          creative_direction: instruction,
          total_jobs: 1,
          completed_jobs: 0,
          failed_jobs: 0,
          updated_at: now,
        })
        .select("*")
        .single();

    if (runError || !run) {
      throw new Error(
        `Could not create edit run: ${runError?.message || "unknown error"}`
      );
    }

    const { data: job, error: jobError } =
      await supabaseAdmin
        .from("generation_jobs")
        .insert({
          run_id: run.id,
          job_index: 0,
          status: "submitting",
          provider: "atlascloud",
          model: ATLAS_IMAGE_MODEL,
          creative_model_id: sourceJob?.creative_model_id || "edit",
          creative_model_name:
            `${sourceJob?.creative_model_name || "Creative"} · Edit`,
          prompt,
          ratio,
          size,
          product_references: sourceJob?.product_references ?? [],
          winning_reference: sourceJob?.winning_reference ?? null,
          landing_page_context: sourceJob?.landing_page_context ?? null,
          provider_request: {
            ...atlasRequest,
            _designer_plan: {
              ...designerPlan,
              engineVersion: "edit-v1",
              operation: "creative_edit",
              sourceAssetId: asset.id,
              sourceGenerationJobId: asset.generation_job_id,
              sourceGenerationRunId: asset.generation_run_id,
              editInstruction: instruction,
              requiredSubjectCount:
                designerPlan?.requiredSubjectCount ?? null,
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
      throw new Error(
        `Could not create edit job: ${jobError?.message || "unknown error"}`
      );
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

      await supabaseAdmin
        .from("generation_runs")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return NextResponse.json({
        success: true,
        runId: run.id,
        jobId: job.id,
        sourceAssetId: asset.id,
        predictionId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "failed",
          error: message,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await supabaseAdmin
        .from("generation_runs")
        .update({
          status: "failed",
          failed_jobs: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Edit creative API error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
