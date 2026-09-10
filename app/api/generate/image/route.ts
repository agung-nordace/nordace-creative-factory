import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Only allow known generated-image/CDN hosts used by AtlasCloud
 * and Supabase. Keep this list intentionally narrow because this
 * endpoint proxies remote files through our server.
 */
function isAllowedHost(hostname: string) {
  const host = hostname.toLowerCase();

  const exactHosts = new Set([
    "atlas-media.oss-us-west-1.aliyuncs.com",
  ]);

  if (exactHosts.has(host)) {
    return true;
  }

  return (
    host === "atlascloud.ai" ||
    host.endsWith(".atlascloud.ai") ||
    host === "supabase.co" ||
    host.endsWith(".supabase.co") ||
    host === "aliyuncs.com" ||
    host.endsWith(".aliyuncs.com")
  );
}

function getExtension(contentType: string) {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("avif")) return "avif";
  if (contentType.includes("gif")) return "gif";
  return "png";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawUrl = searchParams.get("url");
    const shouldDownload =
      searchParams.get("download") === "1";

    if (!rawUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing image URL.",
        },
        { status: 400 }
      );
    }

    let sourceUrl: URL;

    try {
      sourceUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid image URL.",
        },
        { status: 400 }
      );
    }

    if (sourceUrl.protocol !== "https:") {
      return NextResponse.json(
        {
          success: false,
          error: "Only HTTPS image URLs are allowed.",
        },
        { status: 400 }
      );
    }

    if (!isAllowedHost(sourceUrl.hostname)) {
      return NextResponse.json(
        {
          success: false,
          error: `Image host is not allowed: ${sourceUrl.hostname}`,
        },
        { status: 403 }
      );
    }

    /**
     * AtlasCloud output URLs can redirect to their object-storage CDN.
     * fetch follows redirects by default, which is what we want here.
     */
    const upstream = await fetch(sourceUrl.toString(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept:
          "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Could not load generated image. ` +
            `Upstream HTTP ${upstream.status}.`,
        },
        { status: 502 }
      );
    }

    const finalUrl = upstream.url
      ? new URL(upstream.url)
      : sourceUrl;

    /**
     * If Atlas redirects to a different CDN host, verify the redirected
     * destination too before returning bytes to the browser.
     */
    if (!isAllowedHost(finalUrl.hostname)) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Redirected image host is not allowed: ` +
            finalUrl.hostname,
        },
        { status: 403 }
      );
    }

    const buffer = await upstream.arrayBuffer();

    const upstreamContentType =
      upstream.headers.get("content-type") || "";

    const contentType =
      upstreamContentType.startsWith("image/")
        ? upstreamContentType.split(";")[0]
        : "image/png";

    const extension = getExtension(contentType);

    const headers = new Headers();

    headers.set("Content-Type", contentType);

    headers.set(
      "Content-Disposition",
      `${
        shouldDownload ? "attachment" : "inline"
      }; filename="creative-${Date.now()}.${extension}"`
    );

    headers.set(
      "Cache-Control",
      "private, max-age=300"
    );

    /**
     * Prevent browser sniffing and allow the image to render cleanly.
     */
    headers.set(
      "X-Content-Type-Options",
      "nosniff"
    );

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Generated image proxy error:",
      message
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
