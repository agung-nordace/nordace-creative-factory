import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildCreativeTextLayout,
  validateLayout,
  type CreativeTextSpec,
  type TextBlockLayout,
} from "@/lib/creative-text-layout";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function splitWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function estimateCharsPerLine(width: number, fontSize: number) {
  return Math.max(8, Math.floor(width / (fontSize * 0.56)));
}

function wrapText(text: string, width: number, fontSize: number) {
  const maxChars = estimateCharsPerLine(width, fontSize);
  const words = splitWords(text);

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function fitText(block: TextBlockLayout) {
  let fontSize = block.fontSize;

  while (fontSize >= block.minFontSize) {
    const lines = wrapText(block.text, block.width, fontSize);
    const linePx = fontSize * block.lineHeight;
    const totalHeight = lines.length * linePx;

    if (totalHeight <= block.maxHeight) {
      return { fontSize, lines, totalHeight };
    }

    fontSize -= 2;
  }

  const lines = wrapText(block.text, block.width, block.minFontSize);
  const linePx = block.minFontSize * block.lineHeight;
  const maxLines = Math.max(1, Math.floor(block.maxHeight / linePx));

  return {
    fontSize: block.minFontSize,
    lines: lines.slice(0, maxLines),
    totalHeight: Math.min(block.maxHeight, maxLines * linePx),
  };
}

function blockSvg(block: TextBlockLayout) {
  const fitted = fitText(block);

  const text =
    block.uppercase
      ? block.text.toUpperCase()
      : block.text;

  const lines = wrapText(text, block.width, fitted.fontSize).slice(
    0,
    fitted.lines.length
  );

  const anchor =
    block.align === "center"
      ? "middle"
      : block.align === "right"
        ? "end"
        : "start";

  const x =
    block.align === "center"
      ? block.x + block.width / 2
      : block.align === "right"
        ? block.x + block.width
        : block.x;

  const lineHeightPx = fitted.fontSize * block.lineHeight;

  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeightPx;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const isCta = block.role === "cta";

  const bg = isCta
    ? `<rect x="${block.x - 12}" y="${block.y - fitted.fontSize * 0.78}"
        width="${Math.min(block.width + 24, block.width + 24)}"
        height="${Math.max(44, fitted.fontSize * 1.65)}"
        rx="${Math.max(8, fitted.fontSize * 0.28)}"
        fill="#111827" />`
    : "";

  return `
    ${bg}
    <text
      x="${x}"
      y="${block.y}"
      text-anchor="${anchor}"
      font-family="Arial, Helvetica, sans-serif"
      font-size="${fitted.fontSize}"
      font-weight="${block.fontWeight}"
      fill="${isCta ? "#ffffff" : "#111111"}"
      letter-spacing="${block.letterSpacing ?? 0}"
    >${tspans}</text>
  `;
}

function createOverlaySvg(args: {
  width: number;
  height: number;
  blocks: TextBlockLayout[];
}) {
  return `
  <svg width="${args.width}" height="${args.height}" viewBox="0 0 ${args.width} ${args.height}"
       xmlns="http://www.w3.org/2000/svg">
    ${args.blocks.map(blockSvg).join("\n")}
  </svg>
  `;
}

function getTextSpec(job: any): CreativeTextSpec {
  const lp = job?.landing_page_context ?? {};

  return {
    headline:
      job?.rendered_text?.headline ??
      lp?.headline ??
      null,

    subheadline:
      job?.rendered_text?.subheadline ??
      lp?.subheadline ??
      null,

    offer:
      job?.rendered_text?.offer ??
      lp?.offer ??
      null,

    cta:
      job?.rendered_text?.cta ??
      "Shop Now",

    proof:
      job?.rendered_text?.proof ??
      null,

    attribution:
      job?.rendered_text?.attribution ??
      null,
  };
}

export async function POST(request: NextRequest) {
  let activeJobId: number | null = null;

  try {
    const body = await request.json();

    const jobId =
      body?.job_id && Number.isFinite(Number(body.job_id))
        ? Number(body.job_id)
        : null;

    activeJobId = jobId;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Missing job_id" },
        { status: 400 }
      );
    }

    const { data: job, error: jobError } =
      await supabaseAdmin
        .from("generation_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: "Generation job not found" },
        { status: 404 }
      );
    }

    if (!job.output_url) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Art plate is not ready yet. generation_jobs.output_url is empty.",
        },
        { status: 409 }
      );
    }

    await supabaseAdmin
      .from("generation_jobs")
      .update({
        typography_status: "composing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    const text = getTextSpec(job);

    const plan = buildCreativeTextLayout({
      ratio: job.ratio || "4:5",
      creativeModelId: job.creative_model_id || "billboard",
      text,
    });

    const validation = validateLayout(plan);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Typography layout failed QA before rendering.",
          layoutErrors: validation.errors,
          plan,
        },
        { status: 422 }
      );
    }

    // Dynamically import sharp so Next server only loads it on this route.
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;

    const artPlateResponse = await fetch(job.output_url, {
      cache: "no-store",
    });

    if (!artPlateResponse.ok) {
      throw new Error(
        `Could not download art plate: HTTP ${artPlateResponse.status}`
      );
    }

    const artPlateBuffer = Buffer.from(
      await artPlateResponse.arrayBuffer()
    );

    const resizedArt = await sharp(artPlateBuffer)
      .resize(plan.width, plan.height, {
        fit: "cover",
        position: "center",
      })
      .png()
      .toBuffer();

    const overlaySvg = createOverlaySvg({
      width: plan.width,
      height: plan.height,
      blocks: plan.blocks,
    });

    const finalBuffer = await sharp(resizedArt)
      .composite([
        {
          input: Buffer.from(overlaySvg),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    const bucket = "generated-creatives";

    const { data: buckets } =
      await supabaseAdmin.storage.listBuckets();

    if (!(buckets ?? []).some((item) => item.name === bucket)) {
      const { error: bucketError } =
        await supabaseAdmin.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 20 * 1024 * 1024,
          allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
        });

      if (bucketError) {
        throw new Error(
          `Could not create generated-creatives bucket: ${bucketError.message}`
        );
      }
    }

    const filePath =
      `runs/${job.run_id}/job-${job.id}-${Date.now()}.png`;

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, finalBuffer, {
          contentType: "image/png",
          upsert: true,
        });

    if (uploadError) {
      throw new Error(
        `Could not upload final creative: ${uploadError.message}`
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const now = new Date().toISOString();

    const { error: updateError } =
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          art_plate_url: job.output_url,
          final_output_url: publicUrl,
          typography_status: "completed",
          typography_layout: plan,
          typography_qa: {
            valid: true,
            errors: [],
          },
          updated_at: now,
        })
        .eq("id", job.id);

    if (updateError) {
      throw new Error(
        `Could not update job after composition: ${updateError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      artPlateUrl: job.output_url,
      finalOutputUrl: publicUrl,
      text,
      layout: plan,
      qa: {
        valid: true,
        errors: [],
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Compose creative error:", message);

    if (activeJobId) {
      try {
        await supabaseAdmin
          .from("generation_jobs")
          .update({
            typography_status: "failed",
            typography_qa: {
              valid: false,
              errors: [message],
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeJobId);
      } catch {
        // Do not mask the original error.
      }
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
