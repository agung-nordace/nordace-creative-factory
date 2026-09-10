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
                        "â€”"}
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
            <b>â†’</b>
            <span>
              Local Browser Session
            </span>
            <b>â†’</b>
            <span>
              Bulk LP Parser
            </span>
            <b>â†’</b>
            <span>
              Supabase
            </span>
            <b>â†’</b>
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
