import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildDesignerPlan,
  selectReferencePack,
  type CreativeModelInput,
  type LandingPageInput,
  type WinningCreativeInput,
  type ProductReferenceGroup,
} from "@/lib/creative-designer-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProductVariantInput = {
  variantId?: number | null;
  variantSku?: string | null;
  color?: string | null;
  productName?: string | null;
  parentSku?: string | null;
  references?: string[];
};

type ProductInput = {
  productId?: number | null;
  productName?: string | null;
  parentSku?: string | null;
  variants?: ProductVariantInput[];
};

type GenerateBody = {
  products?: ProductInput[];
  landingPage?: LandingPageInput | null;
  winningCreative?: WinningCreativeInput | null;
  creativeModels?: CreativeModelInput[];
  outputCount?: number;
  ratio?: "1:1" | "4:5" | "1.91:1" | "9:16" | string;
  creativeDirection?: string | null;
};

const ATLAS_BASE_URL =
  process.env.ATLAS_API_BASE_URL || "https://api.atlascloud.ai/api/v1";

const ATLAS_IMAGE_MODEL =
  process.env.ATLAS_IMAGE_MODEL || "openai/gpt-image-2.5-flare/edit";

const ATLAS_IMAGE_QUALITY =
  process.env.ATLAS_IMAGE_QUALITY || "high";

const MAX_REFERENCE_IMAGES = 16;

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

function flattenProductReferences(
  products: ProductInput[]
): ProductReferenceGroup[] {
  const groups: ProductReferenceGroup[] = [];

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const references = uniqueUrls(variant.references ?? []);
      if (!references.length) continue;

      groups.push({
        productId:
          product.productId != null ? Number(product.productId) : null,
        productName:
          clean(variant.productName) || clean(product.productName) || null,
        parentSku:
          clean(variant.parentSku) || clean(product.parentSku) || null,
        variantId:
          variant.variantId != null ? Number(variant.variantId) : null,
        variantSku: clean(variant.variantSku) || null,
        color: clean(variant.color) || null,
        references,
      });
    }
  }

  return groups;
}

function getWinningImage(creative?: WinningCreativeInput | null) {
  if (!creative) return null;

  return (
    clean(creative.optimized_url) ||
    clean(creative.file_url) ||
    clean(creative.thumbnail_url) ||
    null
  );
}

function scheduleCreativeModels(
  models: CreativeModelInput[],
  outputCount: number
) {
  if (!models.length) {
    throw new Error("Select at least one Creative Model.");
  }

  return Array.from({ length: outputCount }, (_, index) => {
    return models[index % models.length];
  });
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

function buildAtlasRequest(args: {
  prompt: string;
  images: string[];
  size: string;
}) {
  return {
    model: ATLAS_IMAGE_MODEL,
    images: args.images,
    prompt: args.prompt,
    quality: ATLAS_IMAGE_QUALITY,
    size: args.size,
    background: "auto",
    output_format: "png",
    moderation: "auto",
    n: 1,
    enable_sync_mode: false,
    enable_base64_output: false,
  };
}


function describeFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = (error as Error & {
    cause?: {
      code?: string;
      errno?: number | string;
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
      console.log(
        `AtlasCloud submit attempt ${attempt}/${attempts}:`,
        {
          model: args.payload.model,
          imageCount: Array.isArray(args.payload.images)
            ? args.payload.images.length
            : 0,
          size: args.payload.size,
          quality: args.payload.quality,
        }
      );

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
        responsePayload = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        responsePayload = { raw: responseText };
      }

      if (!response.ok) {
        const message =
          `AtlasCloud HTTP ${response.status}: ` +
          responseText.slice(0, 1500);

        // Don't retry obvious request/auth problems.
        if (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 422
        ) {
          throw new Error(message);
        }

        lastError = message;
      } else {
        return {
          response,
          responseText,
          responsePayload,
        };
      }
    } catch (error) {
      lastError = describeFetchError(error);

      console.error(
        `AtlasCloud submit attempt ${attempt} failed:`,
        lastError
      );

      // Abort/request validation failures should not be hammered forever.
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
    `AtlasCloud network submission failed after ${attempts} attempts. ${lastError}`
  );
}

export async function POST(request: NextRequest) {
  try {
    const atlasApiKey = process.env.ATLAS_API_KEY;

    if (!atlasApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "ATLAS_API_KEY is missing from .env.local",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerateBody;
    const products = Array.isArray(body.products) ? body.products : [];
    const creativeModels = Array.isArray(body.creativeModels)
      ? body.creativeModels
      : [];

    const outputCount = Math.max(
      1,
      Math.min(16, Number(body.outputCount ?? 1))
    );

    const ratio = clean(body.ratio) || "4:5";
    const size = SIZE_BY_RATIO[ratio] || "1024x1280";
    const productGroups = flattenProductReferences(products);

    if (!productGroups.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Select at least one product color/variant with product-reference images.",
        },
        { status: 400 }
      );
    }

    const scheduledModels = scheduleCreativeModels(
      creativeModels,
      outputCount
    );

    const winningImage = getWinningImage(body.winningCreative);

    const { data: run, error: runError } = await supabaseAdmin
      .from("generation_runs")
      .insert({
        status: "submitting",
        output_count: outputCount,
        ratio,
        provider: "atlascloud",
        model: ATLAS_IMAGE_MODEL,
        landing_page: body.landingPage ?? null,
        winning_creative: body.winningCreative ?? null,
        products,
        creative_models: creativeModels,
        creative_direction: clean(body.creativeDirection) || null,
        total_jobs: outputCount,
        completed_jobs: 0,
        failed_jobs: 0,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (runError || !run) {
      throw new Error(
        `Could not create generation run: ${
          runError?.message || "unknown Supabase error"
        }`
      );
    }

    const submittedJobs: Array<{
      id: number;
      jobIndex: number;
      predictionId: string;
      creativeModel: string;
      conceptName: string;
      requiredSubjectCount: number;
    }> = [];

    let failedSubmissions = 0;

    for (let index = 0; index < outputCount; index++) {
      const creativeModel = scheduledModels[index];

      const referencePack = selectReferencePack({
        productGroups,
        winningImage,
        maxImages: MAX_REFERENCE_IMAGES,
      });

      if (referencePack.imageUrls.length < productGroups.length) {
        throw new Error(
          "Not every selected product/color has a usable product reference image."
        );
      }

      const plan = buildDesignerPlan({
        index,
        creativeModel,
        productGroups,
        referencePack,
        landingPage: body.landingPage,
        winningCreative: body.winningCreative,
        creativeDirection: body.creativeDirection,
        ratio,
      });

      const atlasRequest = buildAtlasRequest({
        prompt: plan.finalPrompt,
        images: referencePack.imageUrls,
        size,
      });

      const persistedProviderRequest = {
        ...atlasRequest,
        _designer_plan: {
          engineVersion: "v5-archetype-copy-architecture",
          conceptName: plan.conceptName,
          variationMode: plan.variationMode,
          archetypeName: plan.archetypeName,
          copyArchitecture: plan.copyArchitecture,
          typographyPersonality: plan.typographyPersonality,
          offerTreatment: plan.offerTreatment,
          requiredSubjectCount: plan.requiredSubjectCount,
          subjectContract: plan.subjectContract,
          strategyBrief: plan.strategyBrief,
          copyBrief: plan.copyBrief,
          designBrief: plan.designBrief,
          qaChecklist: plan.qaChecklist,
          referencePack,
          textRenderMode: "native_in_image",
        },
      };

      const now = new Date().toISOString();

      const { data: job, error: jobError } = await supabaseAdmin
        .from("generation_jobs")
        .insert({
          run_id: run.id,
          job_index: index,
          status: "submitting",
          provider: "atlascloud",
          model: ATLAS_IMAGE_MODEL,
          creative_model_id: creativeModel.id,
          creative_model_name: plan.creativeModelName,
          prompt: plan.finalPrompt,
          ratio,
          size,
          product_references: productGroups,
          winning_reference: body.winningCreative ?? null,
          landing_page_context: body.landingPage ?? null,
          provider_request: persistedProviderRequest,

          // V4 renders the graphic design and typography natively in GPT Image.
          // The old post-compositor is no longer part of the main flow.
          rendered_text: null,
          typography_status: "native_render",

          started_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (jobError || !job) {
        failedSubmissions++;
        console.error(
          "Could not create generation job:",
          jobError?.message
        );
        continue;
      }

      try {
        const atlasResult = await submitToAtlas({
          url: `${ATLAS_BASE_URL.replace(/\/+$/, "")}/model/generateImage`,
          apiKey: atlasApiKey,
          payload: atlasRequest,
        });

        const responseText = atlasResult.responseText;
        const responsePayload = atlasResult.responsePayload;

        const predictionId = extractPredictionId(responsePayload);

        if (!predictionId) {
          throw new Error(
            `AtlasCloud request succeeded but no prediction/task id could be detected. Response: ${responseText.slice(
              0,
              1500
            )}`
          );
        }

        await supabaseAdmin
          .from("generation_jobs")
          .update({
            status: "processing",
            prediction_id: predictionId,
            provider_response: responsePayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        submittedJobs.push({
          id: job.id,
          jobIndex: index,
          predictionId,
          creativeModel: plan.creativeModelName,
          conceptName: plan.conceptName,
          requiredSubjectCount: plan.requiredSubjectCount,
        });
      } catch (error) {
        failedSubmissions++;

        const message =
          error instanceof Error ? error.message : String(error);

        console.error(
          `Generation job ${job.id} AtlasCloud submission failed:`,
          message
        );

        await supabaseAdmin
          .from("generation_jobs")
          .update({
            status: "failed",
            error: message,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }
    }

    const runStatus =
      submittedJobs.length > 0 ? "processing" : "failed";

    await supabaseAdmin
      .from("generation_runs")
      .update({
        status: runStatus,
        failed_jobs: failedSubmissions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json({
      success: submittedJobs.length > 0,
      runId: run.id,
      status: runStatus,
      model: ATLAS_IMAGE_MODEL,
      engineVersion: "v5-archetype-copy-architecture",
      ratio,
      size,
      requiredSubjectCount: productGroups.length,
      totalJobs: outputCount,
      submittedJobs: submittedJobs.length,
      failedSubmissions,
      jobs: submittedJobs,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Generate API error:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
