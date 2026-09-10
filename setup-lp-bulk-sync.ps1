param(
  [string]$ProjectPath = "C:\Users\agmag\nordace-creative-factory"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================="
Write-Host " ND Creative Factory - LP Bulk Sync Setup"
Write-Host "========================================="
Write-Host ""

Set-Location $ProjectPath

# ------------------------------------------------------------
# 1. Folders
# ------------------------------------------------------------
New-Item -ItemType Directory -Force "scripts" | Out-Null
New-Item -ItemType Directory -Force ".local" | Out-Null
New-Item -ItemType Directory -Force "app\api\local-sync\landing-pages" | Out-Null
New-Item -ItemType Directory -Force "app\admin-sync" | Out-Null

# ------------------------------------------------------------
# 2. scripts/lp-login.mjs
# ------------------------------------------------------------
@'
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";

const profileDir = path.join(process.cwd(), ".local", "lp-sync-browser");
await fs.mkdir(profileDir, { recursive: true });

console.log("");
console.log("ND Creative Factory - Nordace LP Login");
console.log("---------------------------------------");
console.log("1. Login ke lp.nordace.com");
console.log("2. Buka halaman Landing Pages");
console.log("3. Pastikan tabel LP terlihat");
console.log("4. Tutup browser setelah selesai");
console.log("");

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1440, height: 1000 },
  locale: "en-US",
  args: [
    "--disable-blink-features=AutomationControlled",
    "--no-default-browser-check",
  ],
});

const page = context.pages()[0] || (await context.newPage());

await page.goto("https://lp.nordace.com/landing-pages", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});

console.log("Browser terbuka. Login seperti biasa lalu tutup browser jika tabel LP sudah terlihat.");

await new Promise((resolve) => {
  context.on("close", resolve);
});
'@ | Set-Content -Encoding UTF8 "scripts\lp-login.mjs"

# ------------------------------------------------------------
# 3. API route: app/api/local-sync/landing-pages/route.ts
# ------------------------------------------------------------
@'
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

const LP_LIST_URL = "https://lp.nordace.com/landing-pages";
const PROFILE_DIR = path.join(process.cwd(), ".local", "lp-sync-browser");

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") || "";

  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:")
  );
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

async function needsLogin(page: Page) {
  const currentUrl = page.url().toLowerCase();

  if (currentUrl.includes("/login")) {
    return true;
  }

  const title = (
    await page.title().catch(() => "")
  ).toLowerCase();

  if (title.includes("just a moment")) {
    return true;
  }

  const body = (
    await page.locator("body").innerText().catch(() => "")
  ).toLowerCase();

  return (
    body.includes("just a moment") ||
    body.includes("checking your browser")
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

async function setPerPage96(page: Page) {
  const select = page.locator('select[wire\\:model\\.live="perPage"]');

  if ((await select.count()) === 0) {
    return;
  }

  try {
    await select.selectOption("96");
    await page.waitForTimeout(2500);
    await waitForLandingRows(page);
  } catch {
    // Fallback: continue with source default page size.
  }
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

        const cells = Array.from(
          tr.querySelectorAll("td")
        );

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

        const sourceId = idMatch
          ? Number(idMatch[1])
          : NaN;

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

async function goToPage(
  page: Page,
  pageNumber: number
) {
  await page.goto(
    `${LP_LIST_URL}?page=${pageNumber}`,
    {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }
  );

  await waitForLandingRows(page);
}

async function upsertRows(rows: ParsedLp[]) {
  if (rows.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();

  const payload = rows.map((row) => ({
    url: row.url,
    slug: row.slug,
    title: row.title,
    product_name: row.productName,
    status:
      row.status
        ? row.status.toLowerCase().replace(/\s+/g, "_")
        : "active",

    metadata: {
      source: "nordace_lp_platform",
      source_id: row.sourceId,
      source_status: row.status,
      bulk_synced: true,
    },

    analyzed_at: null,
    updated_at: now,
  }));

  const { error } = await supabaseAdmin
    .from("landing_pages")
    .upsert(payload, {
      onConflict: "url",
    });

  if (error) {
    throw new Error(
      `Supabase LP upsert failed: ${error.message}`
    );
  }

  return payload.length;
}

export async function POST(
  request: NextRequest
) {
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

    const page =
      context.pages()[0] ||
      (await context.newPage());

    await page.goto(
      LP_LIST_URL,
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }
    );

    if (await needsLogin(page)) {
      return NextResponse.json(
        {
          success: false,
          needsLogin: true,
          error:
            "Nordace LP login session belum tersedia. Jalankan `npm run lp:login`, login sekali, lalu coba Sync All lagi.",
        },
        { status: 401 }
      );
    }

    await waitForLandingRows(page);
    await setPerPage96(page);

    const seen =
      new Map<number, ParsedLp>();

    let pagesVisited = 0;
    let rowsSynced = 0;
    let totalDetected: number | null = null;

    for (
      let pageNumber = 1;
      pageNumber <= 200;
      pageNumber++
    ) {
      if (pageNumber > 1) {
        await goToPage(
          page,
          pageNumber
        );
      }

      const parsed =
        await parseCurrentPage(page);

      pagesVisited++;

      if (
        totalDetected == null &&
        parsed.total != null
      ) {
        totalDetected =
          parsed.total;
      }

      const freshRows =
        parsed.rows.filter((row) => {
          if (seen.has(row.sourceId)) {
            return false;
          }

          seen.set(
            row.sourceId,
            row
          );

          return true;
        });

      if (freshRows.length === 0) {
        break;
      }

      rowsSynced +=
        await upsertRows(freshRows);

      if (
        totalDetected != null &&
        seen.size >= totalDetected
      ) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      totalDetected,
      uniqueDetected: seen.size,
      rowsSynced,
      pagesVisited,
      complete:
        totalDetected != null
          ? seen.size >= totalDetected
          : null,
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
'@ | Set-Content -Encoding UTF8 "app\api\local-sync\landing-pages\route.ts"

# ------------------------------------------------------------
# 4. Admin Sync page: app/admin-sync/page.tsx
# ------------------------------------------------------------
@'
"use client";

import { useState } from "react";
import NdWorkspaceShell from "@/components/nd-workspace-shell";

type SyncResult = {
  success?: boolean;
  needsLogin?: boolean;
  error?: string;
  totalDetected?: number | null;
  uniqueDetected?: number;
  rowsSynced?: number;
  pagesVisited?: number;
  complete?: boolean | null;
};

export default function AdminSyncPage() {
  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState<SyncResult | null>(null);

  async function syncLandingPages() {
    setLoading(true);
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/local-sync/landing-pages",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({}),
          }
        );

      const data =
        (await response.json()) as SyncResult;

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <NdWorkspaceShell>
      <main className="page">
        <header>
          <div className="eyebrow">
            LOCAL ADMIN TOOL
          </div>

          <h1>Data Sync</h1>

          <p>
            Sync Nordace source data into Creative Factory.
            This page is intended for localhost admin use.
          </p>
        </header>

        <section className="syncCard">
          <div>
            <div className="cardEyebrow">
              LANDING PAGES
            </div>

            <h2>
              Sync All Landing Pages
            </h2>

            <p>
              Automatically reads the Nordace Landing Platform,
              finds all landing pages, and saves them into Supabase.
              You do not need to add 1,000+ URLs manually.
            </p>
          </div>

          <button
            type="button"
            onClick={
              syncLandingPages
            }
            disabled={loading}
          >
            {loading
              ? "Syncing..."
              : "Sync All Landing Pages"}
          </button>
        </section>

        {result && (
          <section
            className={
              result.success
                ? "result success"
                : "result error"
            }
          >
            {result.success ? (
              <>
                <h3>
                  Landing Page sync complete
                </h3>

                <div className="stats">
                  <div>
                    <span>
                      SOURCE TOTAL
                    </span>
                    <strong>
                      {result.totalDetected ??
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      FOUND
                    </span>
                    <strong>
                      {result.uniqueDetected ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      SYNCED
                    </span>
                    <strong>
                      {result.rowsSynced ??
                        0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      PAGES VISITED
                    </span>
                    <strong>
                      {result.pagesVisited ??
                        0}
                    </strong>
                  </div>
                </div>

                <p>
                  Status:{" "}
                  <strong>
                    {result.complete === false
                      ? "Partial"
                      : "Complete"}
                  </strong>
                </p>
              </>
            ) : (
              <>
                <h3>
                  {result.needsLogin
                    ? "Nordace login required"
                    : "Sync failed"}
                </h3>

                <p>
                  {result.error}
                </p>

                {result.needsLogin && (
                  <div className="command">
                    npm run lp:login
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <section className="help">
          <h3>
            How this works
          </h3>

          <div className="flow">
            <span>
              Nordace Landing Platform
            </span>
            <b>→</b>
            <span>
              Local Browser Session
            </span>
            <b>→</b>
            <span>
              Bulk LP Parser
            </span>
            <b>→</b>
            <span>
              Supabase
            </span>
            <b>→</b>
            <span>
              Creative Factory
            </span>
          </div>
        </section>

        <style jsx>{`
          .page {
            min-height: 100vh;
            padding: 34px;
            background: #f8fafc;
            color: #0f172a;
          }

          header,
          .syncCard,
          .result,
          .help {
            max-width: 1300px;
            margin-left: auto;
            margin-right: auto;
          }

          header {
            margin-bottom: 20px;
          }

          .eyebrow,
          .cardEyebrow {
            color: #2563eb;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .1em;
          }

          h1 {
            margin: 7px 0 5px;
            font-size: 31px;
          }

          header p,
          .syncCard p,
          .help p {
            color: #64748b;
            font-size: 13px;
            line-height: 1.6;
          }

          .syncCard {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 22px;
            padding: 22px;
            border: 1px solid #dbe3ee;
            border-radius: 12px;
            background: white;
          }

          .syncCard h2 {
            margin: 6px 0 6px;
            font-size: 20px;
          }

          .syncCard p {
            max-width: 760px;
            margin: 0;
          }

          .syncCard button {
            flex: 0 0 auto;
            min-height: 44px;
            border: 1px solid #2563eb;
            border-radius: 8px;
            padding: 0 16px;
            background: #2563eb;
            color: white;
            font-size: 12px;
            font-weight: 850;
            cursor: pointer;
          }

          .syncCard button:disabled {
            opacity: .55;
            cursor: not-allowed;
          }

          .result,
          .help {
            margin-top: 14px;
            padding: 20px;
            border-radius: 12px;
            background: white;
          }

          .result.success {
            border: 1px solid #bbf7d0;
          }

          .result.error {
            border: 1px solid #fecaca;
          }

          .result h3,
          .help h3 {
            margin: 0 0 12px;
            font-size: 16px;
          }

          .result p {
            margin: 10px 0 0;
            color: #475569;
            font-size: 12px;
          }

          .stats {
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .stats div {
            padding: 13px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
          }

          .stats span,
          .stats strong {
            display: block;
          }

          .stats span {
            color: #94a3b8;
            font-size: 8px;
            font-weight: 900;
          }

          .stats strong {
            margin-top: 4px;
            font-size: 18px;
          }

          .command {
            margin-top: 12px;
            padding: 11px 13px;
            border-radius: 7px;
            background: #0f172a;
            color: #fff;
            font-family: monospace;
            font-size: 12px;
          }

          .flow {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          }

          .flow span {
            padding: 9px 11px;
            border: 1px solid #dbe3ee;
            border-radius: 7px;
            background: #f8fafc;
            font-size: 10px;
            font-weight: 800;
          }

          .flow b {
            color: #94a3b8;
          }

          @media (max-width: 850px) {
            .syncCard {
              flex-direction: column;
              align-items: stretch;
            }

            .stats {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }
          }
        `}</style>
      </main>
    </NdWorkspaceShell>
  );
}
'@ | Set-Content -Encoding UTF8 "app\admin-sync\page.tsx"

# ------------------------------------------------------------
# 5. package.json - add lp:login script safely
# ------------------------------------------------------------
$packagePath = "package.json"
$package = Get-Content $packagePath -Raw | ConvertFrom-Json

if (-not $package.scripts) {
  $package | Add-Member -MemberType NoteProperty -Name scripts -Value ([pscustomobject]@{})
}

$package.scripts | Add-Member `
  -MemberType NoteProperty `
  -Name "lp:login" `
  -Value "node scripts/lp-login.mjs" `
  -Force

$package | ConvertTo-Json -Depth 100 | Set-Content -Encoding UTF8 $packagePath

# ------------------------------------------------------------
# 6. .gitignore - keep browser session OUT of Git
# ------------------------------------------------------------
if (-not (Test-Path ".gitignore")) {
  New-Item -ItemType File ".gitignore" | Out-Null
}

$gitignore = Get-Content ".gitignore" -Raw

if ($gitignore -notmatch "(?m)^\.local/$") {
  Add-Content ".gitignore" "`n.local/"
}

# ------------------------------------------------------------
# 7. Final info
# ------------------------------------------------------------
Write-Host ""
Write-Host "SETUP COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT COMMAND:"
Write-Host "npm run lp:login" -ForegroundColor Cyan
Write-Host ""
Write-Host "After login:"
Write-Host "npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then open:"
Write-Host "http://localhost:3000/admin-sync" -ForegroundColor Yellow
Write-Host ""
