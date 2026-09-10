import { NextRequest, NextResponse } from "next/server";
import { chromium, BrowserContext, Page } from "playwright";
import { supabaseAdmin } from "@/lib/supabase-admin";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ParsedLp = {
  sourceId: number;
  title: string;
  slug: string;
  productName: string | null;
  status: string | null;
  url: string;
};

type ProductRow = {
  id: number;
  name: string | null;
  sku: string | null;
};

type ExistingLandingPage = {
  id: number;
  url: string;
  slug: string | null;
  title: string | null;
  product_id: number | null;
  product_name: string | null;
  status: string | null;
  headline: string | null;
  subheadline: string | null;
  body_text: string | null;
  raw_html: string | null;
  analyzed_at: string | null;
  metadata: Record<string, unknown> | null;
};

type RenderedAnalysis = {
  title: string | null;
  headline: string | null;
  subheadline: string | null;
  language: string;
  market: string | null;
  offer: string | null;
  bodyText: string;
  rawHtml: string;
  metaDescription: string | null;
  headings: string[];
  paragraphs: string[];
};

const LP_LIST_URL = "https://lp.nordace.com/landing-pages";
const PROFILE_DIR = path.join(process.cwd(), ".local", "lp-sync-browser");

const DETAIL_CONCURRENCY = 4;
const LISTING_PAGE_LIMIT = 200;

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") || "";

  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:")
  );
}

function cleanText(value: string | null | undefined) {
  if (!value) return null;

  const cleaned = value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function normalize(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/\bnordace\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectLanguage(htmlLanguage: string | null, text: string) {
  if (/[\u3040-\u30ff]/.test(text)) return "ja";

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

  if (lower.includes("united kingdom") || lower.includes("£")) return "UK";
  if (lower.includes("australia") || lower.includes("aud")) return "AU";
  if (lower.includes("canada") || lower.includes("cad")) return "CA";
  if (lower.includes("germany") || lower.includes("deutschland")) return "DE";
  if (lower.includes("japan") || /[\u3040-\u30ff]/.test(text)) return "JP";
  if (/\b(indonesia|jakarta|rupiah|idr)\b/i.test(text)) return "ID";

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
    if (match) return cleanText(match[0]);
  }

  return null;
}

/**
 * IMPORTANT:
 * Product from the Nordace Landing Platform listing is authoritative.
 * We use the local product library only to resolve its internal product_id.
 * We DO NOT let page text / headline / generic token matching override it.
 */
function matchAuthoritativeProduct(
  sourceProductName: string | null,
  products: ProductRow[]
) {
  const source = normalize(sourceProductName);

  if (!source) {
    return {
      productId: null as number | null,
      productName: null as string | null,
      method: "no_source_product",
    };
  }

  // STRICT MODE:
  // The Landing Platform product name is authoritative.
  // Only an exact normalized-name match is allowed.
  // No includes(), alias, token, fuzzy, nearest-name, or heuristic fallback.
  const exact = products.find(
    (product) =>
      normalize(product.name) === source
  );

  if (exact) {
    return {
      productId: exact.id,
      // Keep the source label from the Landing Platform.
      // Do not replace it with a guessed/canonicalized product name.
      productName: sourceProductName,
      method: "platform_exact_name",
    };
  }

  console.warn(
    "LP PRODUCT UNRESOLVED - refusing to guess:",
    {
      sourceProductName,
    }
  );

  return {
    productId: null,
    productName: sourceProductName,
    method: "platform_unresolved_no_guess",
  };
}

async function openContext() {
  await fs.mkdir(PROFILE_DIR, { recursive: true });

  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    viewport: {
      width: 1440,
      height: 1000,
    },
    locale: "en-US",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-default-browser-check",
    ],
  });
}

async function waitThroughCloudflare(page: Page) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const title = (await page.title().catch(() => "")).toLowerCase();
    const body = (
      await page.locator("body").innerText().catch(() => "")
    ).toLowerCase();

    const challenged =
      title.includes("just a moment") ||
      body.includes("checking your browser") ||
      body.includes("just a moment");

    if (!challenged) return;

    await page.waitForTimeout(1500);
  }
}

async function needsLogin(page: Page) {
  await waitThroughCloudflare(page);

  const currentUrl = page.url().toLowerCase();

  if (currentUrl.includes("/login")) return true;

  const title = (await page.title().catch(() => "")).toLowerCase();
  const body = (
    await page.locator("body").innerText().catch(() => "")
  ).toLowerCase();

  return (
    title.includes("just a moment") ||
    body.includes("checking your browser") ||
    body.includes("just a moment")
  );
}

async function waitForLandingRows(page: Page) {
  await page
    .locator('tbody tr[wire\\:key]')
    .first()
    .waitFor({
      state: "attached",
      timeout: 30000,
    });
}

async function parseCurrentPage(page: Page) {
  const rows = await page
    .locator('tbody tr[wire\\:key]')
    .evaluateAll((trs) => {
      return trs.flatMap((tr) => {
        const rowText = (tr.textContent || "")
          .replace(/\s+/g, " ")
          .trim();

        const idMatch = rowText.match(/\bID:\s*(\d+)/i);
        const slugMatch = rowText.match(/\bSlug:\s*([a-z0-9-]+)/i);

        const publicLink = tr.querySelector(
          'a[href*="/page/"]'
        ) as HTMLAnchorElement | null;

        const cells = Array.from(tr.querySelectorAll("td"));

        const titleEl = cells[1]?.querySelector(
          "[title]"
        ) as HTMLElement | null;

        const rawTitle =
          titleEl?.getAttribute("title") ||
          cells[1]?.textContent ||
          "";

        const title = rawTitle
          .replace(/\bID:\s*\d+/i, "")
          .replace(/\bSlug:\s*[a-z0-9-]+/i, "")
          .replace(/\s+/g, " ")
          .trim();

        const productName =
          (cells[2]?.textContent || "")
            .replace(/\s+/g, " ")
            .trim() || null;

        const statusCandidates = Array.from(
          tr.querySelectorAll("span")
        )
          .map((el) => (el.textContent || "").trim())
          .filter(Boolean);

        const status =
          statusCandidates.find((value) =>
            [
              "Active",
              "Draft",
              "Archived",
              "Unpublished Changes",
            ].includes(value)
          ) || null;

        const sourceId = idMatch ? Number(idMatch[1]) : NaN;
        const slug = slugMatch?.[1] || "";
        const url = publicLink?.href || "";

        if (
          !Number.isFinite(sourceId) ||
          !slug ||
          !url ||
          !title
        ) {
          return [];
        }

        return [
          {
            sourceId,
            title,
            slug,
            productName,
            status,
            url,
          },
        ];
      });
    });

  const bodyText = await page.locator("body").innerText();

  const totalMatch =
    bodyText.match(/\bof\s+([\d,]+)\s+results\b/i);

  const total = totalMatch
    ? Number(totalMatch[1].replace(/,/g, ""))
    : null;

  return {
    rows: rows as ParsedLp[],
    total,
  };
}

async function goToListingPage(
  page: Page,
  pageNumber: number
) {
  const url =
    `${LP_LIST_URL}?page=${pageNumber}`;

  for (
    let attempt = 1;
    attempt <= 2;
    attempt++
  ) {
    try {
      await page.goto(
        url,
        {
          waitUntil:
            "domcontentloaded",
          timeout: 60000,
        }
      );

      await waitThroughCloudflare(
        page
      );

      const rows =
        page.locator(
          'tbody tr[wire\\:key]'
        );

      await rows
        .first()
        .waitFor({
          state: "attached",
          timeout: 15000,
        });

      return true;
    } catch (error) {
      console.warn(
        `Landing page listing page ${pageNumber} attempt ${attempt} failed`,
        error instanceof Error
          ? error.message
          : String(error)
      );

      if (attempt === 2) {
        console.warn(
          `Stopping listing crawl safely at page ${pageNumber}.`
        );

        return false;
      }

      await page.waitForTimeout(
        2000
      );
    }
  }

  return false;
}

async function loadProducts() {
  const all: ProductRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id,name,sku")
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `Failed loading products: ${error.message}`
      );
    }

    const batch = (data || []) as ProductRow[];
    all.push(...batch);

    if (batch.length < pageSize) break;
  }

  console.log(`Bulk LP sync: loaded ${all.length} products`);

  return all;
}

async function loadExistingLandingPages() {
  const map = new Map<string, ExistingLandingPage>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("landing_pages")
      .select(
        "id,url,slug,title,product_id,product_name,status,headline,subheadline,body_text,raw_html,analyzed_at,metadata"
      )
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `Failed loading existing landing pages: ${error.message}`
      );
    }

    const batch = (data || []) as ExistingLandingPage[];

    for (const row of batch) {
      map.set(row.url, row);
    }

    if (batch.length < pageSize) break;
  }

  return map;
}

async function syncListingRows(
  rows: ParsedLp[],
  products: ProductRow[],
  existingMap: Map<string, ExistingLandingPage>
) {
  if (!rows.length) {
    return {
      touched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
    };
  }

  const now = new Date().toISOString();

  let touched = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const existing = existingMap.get(row.url);

    const matched = matchAuthoritativeProduct(
      row.productName,
      products
    );

    const normalizedStatus = row.status
      ? row.status.toLowerCase().replace(/\s+/g, "_")
      : "active";

    const sourceIdFromExisting =
      typeof existing?.metadata?.source_id === "number"
        ? existing.metadata.source_id
        : Number(existing?.metadata?.source_id || 0) || null;

    const isNew = !existing;

    const listingChanged =
      isNew ||
      existing?.slug !== row.slug ||
      existing?.title !== row.title ||
      existing?.product_name !== matched.productName ||
      existing?.product_id !== matched.productId ||
      existing?.status !== normalizedStatus ||
      sourceIdFromExisting !== row.sourceId;

    if (!listingChanged) {
      skipped += 1;
      continue;
    }

    const mergedMetadata = {
      ...(existing?.metadata || {}),
      source: "nordace_lp_platform",
      source_id: row.sourceId,
      source_status: row.status,
      source_product_name: row.productName,
      product_match_method: matched.method,
      bulk_synced: true,
      last_index_sync_at: now,
    };

    const payload = {
      url: row.url,
      slug: row.slug,
      title: row.title,

      // Strict Product Lock:
      // source product from Landing Platform is authoritative.
      // Never guess another product.
      product_id: matched.productId,
      product_name: matched.productName,

      status: normalizedStatus,
      metadata: mergedMetadata,
      updated_at: now,

      // Never wipe completed analysis here.
      // Existing headline/body/analyzed_at stay untouched.
    };

    const { data, error } = await supabaseAdmin
      .from("landing_pages")
      .upsert(payload, {
        onConflict: "url",
      })
      .select(
        "id,url,slug,title,product_id,product_name,status,headline,subheadline,body_text,raw_html,analyzed_at,metadata"
      )
      .single();

    if (error) {
      throw new Error(
        `Supabase LP index upsert failed for ${row.url}: ${error.message}`
      );
    }

    if (data) {
      existingMap.set(
        row.url,
        data as ExistingLandingPage
      );
    }

    touched += 1;

    if (isNew) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return {
    touched,
    inserted,
    updated,
    skipped,
  };
}

function needsRenderedAnalysis(
  existing: ExistingLandingPage | undefined
) {
  if (!existing) {
    return true;
  }

  // A completed LP is NEVER auto-analyzed again.
  // Re-analysis stays manual via the existing Re-analyze button.
  const hasHeadline =
    Boolean(cleanText(existing.headline));

  const hasBody =
    Boolean(cleanText(existing.body_text));

  const hasAnalysisTimestamp =
    Boolean(existing.analyzed_at);

  return !(
    hasHeadline &&
    hasBody &&
    hasAnalysisTimestamp
  );
}

async function extractRenderedAnalysis(
  page: Page,
  url: string
): Promise<RenderedAnalysis> {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await waitThroughCloudflare(page);

  if (await needsLogin(page)) {
    throw new Error(
      "Nordace session/challenge blocked the landing page."
    );
  }

  // Give client-rendered LP sections time to settle.
  await page.waitForTimeout(900);

  const rawHtml = await page.content();

  const extracted = await page.evaluate(() => {
    const clean = (value: string | null | undefined) =>
      (value || "").replace(/\s+/g, " ").trim();

    const isVisible = (el: Element) => {
      const node = el as HTMLElement;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const textOf = (el: Element | null) =>
      el ? clean((el as HTMLElement).innerText || el.textContent) : "";

    const metaDescription =
      (
        document.querySelector(
          'meta[name="description"]'
        ) as HTMLMetaElement | null
      )?.content ||
      (
        document.querySelector(
          'meta[property="og:description"]'
        ) as HTMLMetaElement | null
      )?.content ||
      "";

    const headingNodes = Array.from(
      document.querySelectorAll(
        "h1,h2,h3,[role='heading'],[class*='headline'],[class*='Headline'],[class*='title'],[class*='Title']"
      )
    ).filter(isVisible);

    const headings = Array.from(
      new Set(
        headingNodes
          .map(textOf)
          .filter(
            (text) =>
              text.length >= 3 &&
              text.length <= 500
          )
      )
    ).slice(0, 80);

    const visibleH1 = Array.from(
      document.querySelectorAll("h1")
    )
      .filter(isVisible)
      .map(textOf)
      .filter(Boolean);

    let headline = visibleH1[0] || "";

    // Fallback for visual builders that do not use semantic H1.
    if (!headline) {
      const candidates = headingNodes
        .map((el) => {
          const text = textOf(el);
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const fontSize =
            parseFloat(style.fontSize || "0") || 0;

          return {
            text,
            fontSize,
            top: rect.top + window.scrollY,
          };
        })
        .filter(
          (item) =>
            item.text.length >= 12 &&
            item.text.length <= 260 &&
            item.fontSize >= 20 &&
            item.top < 1800
        )
        .sort((a, b) => {
          if (Math.abs(b.fontSize - a.fontSize) > 3) {
            return b.fontSize - a.fontSize;
          }

          return a.top - b.top;
        });

      headline = candidates[0]?.text || "";
    }

    let subheadline = "";

    for (const text of headings) {
      if (
        text &&
        text !== headline &&
        text.length >= 8
      ) {
        subheadline = text;
        break;
      }
    }

    if (!subheadline && metaDescription !== headline) {
      subheadline = clean(metaDescription);
    }

    const paragraphs = Array.from(
      document.querySelectorAll("p")
    )
      .filter(isVisible)
      .map(textOf)
      .filter(Boolean)
      .slice(0, 100);

    const bodyText = clean(document.body?.innerText || "");
    const htmlLanguage =
      document.documentElement.getAttribute("lang") || "";

    return {
      title: clean(document.title),
      headline: clean(headline),
      subheadline: clean(subheadline),
      metaDescription: clean(metaDescription),
      headings,
      paragraphs,
      bodyText,
      htmlLanguage,
    };
  });

  return {
    title: cleanText(extracted.title),
    headline: cleanText(extracted.headline),
    subheadline: cleanText(extracted.subheadline),
    language: detectLanguage(
      extracted.htmlLanguage,
      extracted.bodyText
    ),
    market: detectMarket(extracted.bodyText),
    offer: detectOffer(extracted.bodyText),
    bodyText: extracted.bodyText,
    rawHtml,
    metaDescription: cleanText(extracted.metaDescription),
    headings: extracted.headings,
    paragraphs: extracted.paragraphs,
  };
}

async function saveRenderedAnalysis(
  row: ParsedLp,
  analysis: RenderedAnalysis,
  products: ProductRow[],
  existingMap: Map<string, ExistingLandingPage>
) {
  const existing = existingMap.get(row.url);
  const matched = matchAuthoritativeProduct(
    row.productName,
    products
  );

  const now = new Date().toISOString();

  const mergedMetadata = {
    ...(existing?.metadata || {}),
    source: "nordace_lp_platform",
    source_id: row.sourceId,
    source_status: row.status,
    source_product_name: row.productName,
    product_match_method: matched.method,
    analysis_method: "playwright_rendered_dom",
    meta_description: analysis.metaDescription,
    headings: analysis.headings,
    paragraphs: analysis.paragraphs,
    auto_analyzed: true,
    last_analysis_at: now,
  };

  const { error } = await supabaseAdmin
    .from("landing_pages")
    .upsert(
      {
        url: row.url,
        slug: row.slug,

        // Keep the Platform title as the library title.
        // Page <title> can be generic or SEO-oriented.
        title: row.title,

        // Product remains authoritative from the LP Platform listing.
        // If there is no exact normalized-name match in Products Library,
        // product_id stays null and source product_name is preserved.
        product_id: matched.productId,
        product_name: matched.productName,

        language: analysis.language,
        market: analysis.market,

        status: row.status
          ? row.status.toLowerCase().replace(/\s+/g, "_")
          : "active",

        headline: analysis.headline,
        subheadline: analysis.subheadline,
        offer: analysis.offer,

        body_text: analysis.bodyText.slice(0, 100000),
        raw_html: analysis.rawHtml.slice(0, 100000),

        metadata: mergedMetadata,

        analyzed_at: now,
        updated_at: now,
      },
      {
        onConflict: "url",
      }
    );

  if (error) {
    throw new Error(
      `Failed saving rendered analysis for ${row.url}: ${error.message}`
    );
  }
}

async function analyzeRows(
  context: BrowserContext,
  rows: ParsedLp[],
  products: ProductRow[],
  existingMap: Map<string, ExistingLandingPage>
) {
  const queue = rows.filter((row) =>
    needsRenderedAnalysis(existingMap.get(row.url))
  );

  let analyzed = 0;
  let failed = 0;

  console.log(
    `Bulk LP sync: ${queue.length} landing pages need rendered analysis`
  );

  if (!queue.length) {
    return {
      requested: 0,
      analyzed: 0,
      failed: 0,
    };
  }

  let cursor = 0;

  async function worker(workerId: number) {
    const detailPage = await context.newPage();

    try {
      while (true) {
        const index = cursor++;
        const row = queue[index];

        if (!row) break;

        try {
          console.log(
            `[LP ANALYZE ${index + 1}/${queue.length}] ${row.title}`
          );

          const analysis = await extractRenderedAnalysis(
            detailPage,
            row.url
          );

          await saveRenderedAnalysis(
            row,
            analysis,
            products,
            existingMap
          );

          analyzed++;

          console.log(
            `[LP ANALYZE OK ${analyzed}/${queue.length}] ` +
              `headline=${analysis.headline ? "YES" : "NO"} ` +
              `product=${row.productName || "-"}`
          );
        } catch (error) {
          failed++;

          console.error(
            `[LP ANALYZE FAILED worker=${workerId}]`,
            row.url,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    } finally {
      await detailPage.close().catch(() => undefined);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(DETAIL_CONCURRENCY, queue.length) },
      (_, index) => worker(index + 1)
    )
  );

  return {
    requested: queue.length,
    analyzed,
    failed,
  };
}

export async function POST(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Bulk Landing Page sync only runs from localhost.",
      },
      { status: 403 }
    );
  }

  let context: BrowserContext | null = null;

  try {
    context = await openContext();

    const listingPage =
      context.pages()[0] ||
      (await context.newPage());

    await listingPage.goto(
      LP_LIST_URL,
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }
    );

    if (await needsLogin(listingPage)) {
      return NextResponse.json(
        {
          success: false,
          needsLogin: true,
          error:
            "Nordace LP login session belum tersedia. Jalankan `npm run lp:login`, login sekali, lalu coba Sync Landing Pages lagi.",
        },
        { status: 401 }
      );
    }

    await waitForLandingRows(listingPage);

    const products = await loadProducts();
    const existingMap = await loadExistingLandingPages();

    const seen = new Map<number, ParsedLp>();

    let pagesVisited = 0;
    let rowsSynced = 0;
    let rowsInserted = 0;
    let rowsUpdated = 0;
    let rowsSkipped = 0;
    let totalDetected: number | null = null;

    for (
      let pageNumber = 1;
      pageNumber <= LISTING_PAGE_LIMIT;
      pageNumber++
    ) {
      if (pageNumber > 1) {
        const loaded =
          await goToListingPage(
            listingPage,
            pageNumber
          );

        if (!loaded) {
          console.warn(
            `Listing crawl stopped safely at page ${pageNumber}. ` +
              `Continuing with ${seen.size} landing pages already found.`
          );

          break;
        }
      }

      const parsed = await parseCurrentPage(listingPage);
      pagesVisited++;

      if (
        totalDetected == null &&
        parsed.total != null
      ) {
        totalDetected = parsed.total;
      }

      const freshRows =
        parsed.rows.filter((row) => {
          if (seen.has(row.sourceId)) {
            return false;
          }

          seen.set(row.sourceId, row);
          return true;
        });

      if (!freshRows.length) {
        break;
      }

      const syncResult = await syncListingRows(
        freshRows,
        products,
        existingMap
      );

      rowsSynced += syncResult.touched;
      rowsInserted += syncResult.inserted;
      rowsUpdated += syncResult.updated;
      rowsSkipped += syncResult.skipped;

      console.log(
        `Bulk LP index: page=${pageNumber} ` +
          `found=${seen.size}/${totalDetected ?? "?"} ` +
          `new=${rowsInserted} updated=${rowsUpdated} skipped=${rowsSkipped}`
      );

      if (
        totalDetected != null &&
        seen.size >= totalDetected
      ) {
        break;
      }
    }

    const allRows = Array.from(seen.values());

    console.log(
      `Bulk LP index complete: ${allRows.length} records. ` +
        `new=${rowsInserted}, updated=${rowsUpdated}, skipped=${rowsSkipped}. ` +
        `Only new/incomplete LPs will be analyzed.`
    );

    const analysisResult = await analyzeRows(
      context,
      allRows,
      products,
      existingMap
    );

    return NextResponse.json({
      success: true,

      totalDetected,
      uniqueDetected: seen.size,
      rowsSynced,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      pagesVisited,

      analysisRequested:
        analysisResult.requested,
      rowsAnalyzed:
        analysisResult.analyzed,
      analysisFailed:
        analysisResult.failed,

      complete:
        totalDetected != null
          ? seen.size >= totalDetected
          : null,

      message:
        totalDetected != null && seen.size < totalDetected
          ? `Partial index scan: ${seen.size}/${totalDetected} found. ${rowsInserted} new, ${rowsUpdated} changed, ${rowsSkipped} unchanged skipped. ${analysisResult.analyzed} auto-analyzed; ${analysisResult.failed} failed.`
          : analysisResult.requested > 0
            ? `Incremental sync complete. ${rowsInserted} new, ${rowsUpdated} changed, ${rowsSkipped} unchanged skipped. ${analysisResult.analyzed} incomplete/new landing pages auto-analyzed; ${analysisResult.failed} failed.`
            : `Incremental sync complete. ${rowsInserted} new, ${rowsUpdated} changed, ${rowsSkipped} unchanged skipped. No completed landing pages were re-analyzed.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Bulk Landing Page sync failed:",
      message
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  } finally {
    await context
      ?.close()
      .catch(() => undefined);
  }
}
