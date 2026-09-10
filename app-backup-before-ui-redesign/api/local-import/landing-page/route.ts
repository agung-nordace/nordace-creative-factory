import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProductRow = {
  id: number;
  name: string | null;
  sku: string | null;
};

function cleanText(value: string | null | undefined) {
  if (!value) return null;

  const cleaned = value
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function normalize(value: string | null | undefined) {
  if (!value) return "";

  return value
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/\bnordace\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(value: string | null | undefined) {
  if (!value) return "";

  return value
    .toLowerCase()
    .replace(/\bnordace\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function tokenize(value: string | null | undefined) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function detectLanguage(
  htmlLanguage: string | undefined,
  text: string
) {
  if (/[\u3040-\u30ff]/.test(text)) {
    return "ja";
  }

  if (
    /\b(yang|dan|dengan|untuk|anda|tidak|saat|bisa|dari|ini|tas|membawa|kesalahan)\b/i.test(
      text.slice(0, 15000)
    )
  ) {
    return "id";
  }

  const htmlLang =
    htmlLanguage
      ?.toLowerCase()
      .split("-")[0]
      .trim() || "";

  return htmlLang || "en";
}

function detectMarket(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes("united kingdom") ||
    lower.includes("£")
  ) {
    return "UK";
  }

  if (
    lower.includes("australia") ||
    lower.includes("aud")
  ) {
    return "AU";
  }

  if (
    lower.includes("canada") ||
    lower.includes("cad")
  ) {
    return "CA";
  }

  if (
    lower.includes("germany") ||
    lower.includes("deutschland")
  ) {
    return "DE";
  }

  if (
    lower.includes("japan") ||
    /[\u3040-\u30ff]/.test(text)
  ) {
    return "JP";
  }

  if (
    /\b(indonesia|jakarta|rupiah|idr)\b/i.test(text)
  ) {
    return "ID";
  }

  return null;
}

function detectOffer(text: string) {
  const patterns = [
    /\b\d{1,2}%\s*off\b/i,
    /\bsave\s+\d{1,2}%\b/i,
    /\bget\s+\d{1,2}%\s*off\b/i,
    /\bup\s+to\s+\d{1,2}%\s*off\b/i,
    /\bfree\s+shipping\b/i,
    /\bdiskon\s+\d{1,2}%\b/i,
    /\bhemat\s+\d{1,2}%\b/i,
    /\bgratis\s+ongkir\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return null;
}

function findProduct(
  products: ProductRow[],
  landingPageUrl: URL,
  title: string | null,
  headline: string | null,
  bodyText: string
) {
  // =========================================================
  // 1. EXACT URL / SLUG MATCH
  //
  // Siena Pro Tote Bag Grande
  // ->
  // siena-pro-tote-bag-grande
  //
  // URL:
  // /page/2770/siena-pro-tote-bag-grande-kesalahan...
  // =========================================================

  const decodedPath =
    decodeURIComponent(
      landingPageUrl.pathname
    ).toLowerCase();

  for (const product of products) {
    if (!product.name) continue;

    const productSlug =
      normalizeSlug(product.name);

    if (
      productSlug &&
      decodedPath.includes(productSlug)
    ) {
      return {
        product,
        method: "exact_url",
        score: 10000,
      };
    }
  }

  // =========================================================
  // 2. EXACT TITLE MATCH
  // =========================================================

  const normalizedTitle =
    normalize(title);

  for (const product of products) {
    if (!product.name) continue;

    const productName =
      normalize(product.name);

    if (
      productName &&
      normalizedTitle.includes(productName)
    ) {
      return {
        product,
        method: "exact_title",
        score: 9000,
      };
    }
  }

  // =========================================================
  // 3. EXACT HEADLINE MATCH
  // =========================================================

  const normalizedHeadline =
    normalize(headline);

  for (const product of products) {
    if (!product.name) continue;

    const productName =
      normalize(product.name);

    if (
      productName &&
      normalizedHeadline.includes(productName)
    ) {
      return {
        product,
        method: "exact_headline",
        score: 8000,
      };
    }
  }

  // =========================================================
  // 4. TOKEN MATCH
  // =========================================================

  const combined = normalize(
    [
      decodedPath,
      title,
      headline,
      bodyText.slice(0, 30000),
    ]
      .filter(Boolean)
      .join(" ")
  );

  const combinedTokens =
    new Set(tokenize(combined));

  let best:
    | {
        product: ProductRow;
        method: string;
        score: number;
      }
    | null = null;

  for (const product of products) {
    if (!product.name) continue;

    const tokens =
      tokenize(product.name);

    if (tokens.length === 0) {
      continue;
    }

    let matched = 0;

    for (const token of tokens) {
      if (
        combinedTokens.has(token)
      ) {
        matched++;
      }
    }

    const coverage =
      matched / tokens.length;

    if (coverage < 0.75) {
      continue;
    }

    const score =
      Math.round(
        coverage * 1000 +
        matched * 50
      );

    if (
      !best ||
      score > best.score
    ) {
      best = {
        product,
        method: "token_match",
        score,
      };
    }
  }

  return best;
}

export async function POST(
  request: NextRequest
) {
  const startedAt = Date.now();

  try {
    // =========================================================
    // ENVIRONMENT
    // =========================================================
    // Production import is allowed. Remote URLs remain restricted
    // to the Nordace LP allowlist validated below.
    // =========================================================

    // =========================================================
    // INPUT
    // =========================================================

    const body =
      await request.json();

    const rawUrl =
      typeof body?.url === "string"
        ? body.url.trim()
        : "";

    if (!rawUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Landing page URL is required.",
        },
        { status: 400 }
      );
    }

    let landingPageUrl: URL;

    try {
      landingPageUrl =
        new URL(rawUrl);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid landing page URL.",
        },
        { status: 400 }
      );
    }

    const allowedHosts =
      new Set([
        "lp.nordace.com",
        "www.lp.nordace.com",
      ]);

    if (
      !allowedHosts.has(
        landingPageUrl.hostname.toLowerCase()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only lp.nordace.com URLs are allowed.",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // FETCH LP
    // =========================================================

    console.log(
      "Fetching landing page:",
      landingPageUrl.toString()
    );

    async function fetchLandingPage() {
      const targetUrl = landingPageUrl.toString();

      const browserHeaders: Record<string, string> = {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9",
        "Cache-Control":
          "no-cache",
        Pragma:
          "no-cache",
        Referer:
          "https://lp.nordace.com/",
        "Sec-Fetch-Dest":
          "document",
        "Sec-Fetch-Mode":
          "navigate",
        "Sec-Fetch-Site":
          "same-origin",
        "Sec-Fetch-User":
          "?1",
        "Upgrade-Insecure-Requests":
          "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
      };

      const attempts = [
        targetUrl,
        targetUrl.endsWith("/")
          ? targetUrl
          : `${targetUrl}/`,
      ];

      let lastStatus = 0;
      let lastBody = "";

      for (const url of attempts) {
        const response = await fetch(url, {
          method: "GET",
          headers: browserHeaders,
          cache: "no-store",
          redirect: "follow",
        });

        lastStatus = response.status;

        if (response.ok) {
          return {
            html: await response.text(),
            finalUrl: response.url || url,
          };
        }

        lastBody = (await response.text())
          .replace(/\s+/g, " ")
          .slice(0, 500);

        console.warn(
          "Landing page fetch attempt failed:",
          {
            url,
            status: response.status,
            statusText: response.statusText,
            bodyPreview: lastBody,
          }
        );

        if (response.status !== 403) {
          break;
        }
      }

      throw new Error(
        `Landing page fetch failed: ${lastStatus}` +
          (lastBody
            ? ` — ${lastBody.slice(0, 180)}`
            : "")
      );
    }

    const {
      html,
      finalUrl,
    } = await fetchLandingPage();

    // =========================================================
    // PARSE HTML
    // =========================================================

    const $ =
      cheerio.load(html);

    $(
      "script,style,noscript,svg,iframe"
    ).remove();

    const title =
      cleanText(
        $("title").first().text()
      ) ||
      cleanText(
        $(
          'meta[property="og:title"]'
        ).attr("content")
      );

    const metaDescription =
      cleanText(
        $(
          'meta[name="description"]'
        ).attr("content")
      ) ||
      cleanText(
        $(
          'meta[property="og:description"]'
        ).attr("content")
      );

    const headline =
      cleanText(
        $("h1").first().text()
      );

    const firstH2 =
      cleanText(
        $("h2").first().text()
      );

    const headings =
      $("h1,h2,h3")
        .map((_, el) =>
          cleanText($(el).text())
        )
        .get()
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
        .slice(0, 80);

    const paragraphs =
      $("p")
        .map((_, el) =>
          cleanText($(el).text())
        )
        .get()
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
        .slice(0, 100);

    const bodyText =
      cleanText(
        $("body").text()
      ) ?? "";

    // =========================================================
    // PRODUCTS
    // =========================================================

    const {
      data: productRows,
      error: productError,
    } = await supabaseAdmin
      .from("products")
      .select(
        "id,name,sku"
      )
      .eq(
        "language",
        "en"
      )
      .limit(1000);

    if (productError) {
      throw new Error(
        `Failed loading products: ${productError.message}`
      );
    }

    const products =
      (productRows ??
        []) as ProductRow[];

    console.log(
      `Product candidates loaded: ${products.length}`
    );

    // =========================================================
    // PRODUCT MATCH
    // =========================================================

    const match =
      findProduct(
        products,
        landingPageUrl,
        title,
        headline,
        bodyText
      );

    const matchedProduct =
      match?.product ??
      null;

    console.log(
      "===================================="
    );

    console.log(
      "LP PRODUCT DETECTION"
    );

    console.log(
      "URL:",
      landingPageUrl.pathname
    );

    console.log(
      "MATCH:",
      matchedProduct?.name ??
        "NOT MATCHED"
    );

    console.log(
      "SKU:",
      matchedProduct?.sku ??
        "-"
    );

    console.log(
      "METHOD:",
      match?.method ??
        "-"
    );

    console.log(
      "SCORE:",
      match?.score ??
        0
    );

    console.log(
      "===================================="
    );

    // =========================================================
    // LANGUAGE ETC
    // =========================================================

    const language =
      detectLanguage(
        $("html").attr("lang"),
        bodyText
      );

    const market =
      detectMarket(
        bodyText
      );

    const offer =
      detectOffer(
        bodyText
      );

    let subheadline =
      firstH2 ||
      metaDescription ||
      null;

    if (
      subheadline === headline
    ) {
      subheadline =
        metaDescription;
    }

    const pathParts =
      landingPageUrl.pathname
        .split("/")
        .filter(Boolean);

    const slug =
      pathParts[
        pathParts.length - 1
      ] ??
      landingPageUrl.hostname;

    const now =
      new Date().toISOString();

    // =========================================================
    // SAVE
    // =========================================================

    const {
      data: saved,
      error: saveError,
    } = await supabaseAdmin
      .from("landing_pages")
      .upsert(
        {
          url:
            landingPageUrl.toString(),

          slug,

          title,

          product_id:
            matchedProduct?.id ??
            null,

          product_name:
            matchedProduct?.name ??
            null,

          language,

          market,

          status:
            "active",

          headline,

          subheadline,

          offer,

          body_text:
            bodyText.slice(
              0,
              100000
            ),

          raw_html:
            html.slice(
              0,
              100000
            ),

          metadata: {
            meta_description:
              metaDescription,

            headings,

            paragraphs,

            detected_product_id:
              matchedProduct?.id ??
              null,

            detected_product_name:
              matchedProduct?.name ??
              null,

            detected_product_sku:
              matchedProduct?.sku ??
              null,

            product_match_method:
              match?.method ??
              null,

            product_match_score:
              match?.score ??
              0,

            final_url:
              finalUrl,
          },

          analyzed_at:
            now,

          updated_at:
            now,
        },
        {
          onConflict:
            "url",
        }
      )
      .select(
        `
        id,
        url,
        slug,
        title,
        product_id,
        product_name,
        language,
        market,
        status,
        headline,
        subheadline,
        offer,
        analyzed_at,
        updated_at
        `
      )
      .single();

    if (saveError) {
      throw new Error(
        `Landing page save failed: ${saveError.message}`
      );
    }

    return NextResponse.json({
      success: true,

      landingPage:
        saved,

      productDetection: {
        matched:
          Boolean(
            matchedProduct
          ),

        id:
          matchedProduct?.id ??
          null,

        name:
          matchedProduct?.name ??
          null,

        sku:
          matchedProduct?.sku ??
          null,

        method:
          match?.method ??
          null,

        score:
          match?.score ??
          0,
      },

      durationMs:
        Date.now() -
        startedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Landing page importer:",
      message
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