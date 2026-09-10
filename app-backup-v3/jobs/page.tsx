"use client";

import { useEffect, useMemo, useState } from "react";
import NdWorkspaceShell from "@/components/nd-workspace-shell";

type Job = {
  id: number;
  run_id: number;
  job_index: number;
  status: string;
  creative_model_name?: string | null;
  ratio?: string | null;
  output_url?: string | null;
  error?: string | null;
};

type Run = {
  id: number;
  status: string;
  output_count?: number | null;
  ratio?: string | null;
  provider?: string | null;
  model?: string | null;
  total_jobs?: number | null;
  completed_jobs?: number | null;
  failed_jobs?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  creative_direction?: string | null;
  jobs?: Job[];
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  } catch {
    return value;
  }
}

export default function JobsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadRuns() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/jobs?limit=75",
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          "Could not load generation jobs."
        );
      }

      setRuns(
        Array.isArray(result.data)
          ? result.data
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(err)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  const filteredRuns = useMemo(
    () =>
      runs.filter((run) => {
        if (filter === "all") return true;
        return run.status === filter;
      }),
    [runs, filter]
  );

  return (
    <NdWorkspaceShell>
      <main className="page">
        <header>
          <div>
            <div className="eyebrow">
              CREATIVE FACTORY
            </div>

            <h1>Jobs</h1>

            <p>
              Generation, edit and repurpose runs in one place.
            </p>
          </div>

          <button onClick={loadRuns}>
            ↻ Refresh
          </button>
        </header>

        <div className="toolbar">
          {[
            ["all", "All"],
            ["processing", "Processing"],
            ["completed", "Completed"],
            ["failed", "Failed"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={
                filter === value
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(value)
              }
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="empty error">
            <strong>Could not load jobs</strong>
            <span>{error}</span>
          </div>
        ) : loading ? (
          <div className="empty">
            Loading jobs...
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="empty">
            No generation runs yet.
          </div>
        ) : (
          <div className="runs">
            {filteredRuns.map((run) => {
              const jobs = run.jobs || [];
              const completed = jobs.filter(
                (job) =>
                  job.status === "completed"
              ).length;

              const failed = jobs.filter(
                (job) =>
                  job.status === "failed"
              ).length;

              const total =
                jobs.length ||
                Number(run.total_jobs || 0);

              return (
                <article key={run.id}>
                  <div className="runHeader">
                    <div>
                      <div className="runTitle">
                        <strong>
                          Run #{run.id}
                        </strong>

                        <span
                          className={`status ${run.status}`}
                        >
                          {run.status}
                        </span>
                      </div>

                      <p>
                        {formatDate(
                          run.created_at
                        )}
                      </p>
                    </div>

                    <div className="runStats">
                      <div>
                        <span>Jobs</span>
                        <strong>{total}</strong>
                      </div>

                      <div>
                        <span>Ready</span>
                        <strong>{completed}</strong>
                      </div>

                      <div>
                        <span>Failed</span>
                        <strong>{failed}</strong>
                      </div>

                      <div>
                        <span>Ratio</span>
                        <strong>
                          {run.ratio || "—"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="jobsGrid">
                    {jobs.map((job) => {
                      const previewUrl =
                        job.output_url
                          ? `/api/generate/image?url=${encodeURIComponent(job.output_url)}`
                          : null;

                      return (
                        <div
                          key={job.id}
                          className="jobCard"
                        >
                          <div className="jobTop">
                            <strong>
                              #{job.job_index + 1}{" "}
                              {job.creative_model_name ||
                                "Creative"}
                            </strong>

                            <span
                              className={`jobStatus ${job.status}`}
                            >
                              {job.status}
                            </span>
                          </div>

                          <div className="jobMeta">
                            {job.ratio || "—"}
                          </div>

                          {job.error && (
                            <div className="jobError">
                              {job.error}
                            </div>
                          )}

                          {previewUrl && (
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Result
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <style jsx>{`
          .page {
            min-height: 100vh;
            padding: 34px;
            background: #f8fafc;
            color: #0f172a;
          }

          header,
          .toolbar,
          .runs,
          .empty {
            max-width: 1450px;
            margin-left: auto;
            margin-right: auto;
          }

          header {
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 15px;
          }

          .eyebrow {
            color: #2563eb;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .1em;
          }

          h1 {
            margin: 7px 0 5px;
            font-size: 31px;
          }

          header p {
            margin: 0;
            color: #64748b;
            font-size: 13px;
          }

          header > button {
            min-height: 38px;
            border: 1px solid #cbd5e1;
            border-radius: 7px;
            padding: 0 12px;
            background: white;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
          }

          .toolbar {
            margin-bottom: 12px;
            display: flex;
            gap: 6px;
          }

          .toolbar button {
            min-height: 34px;
            border: 1px solid #cbd5e1;
            border-radius: 999px;
            padding: 0 11px;
            background: white;
            color: #475569;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
          }

          .toolbar button.active {
            border-color: #93c5fd;
            background: #eff6ff;
            color: #1d4ed8;
          }

          .runs {
            display: grid;
            gap: 11px;
          }

          article {
            padding: 15px;
            border: 1px solid #dbe3ee;
            border-radius: 10px;
            background: white;
          }

          .runHeader {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
          }

          .runTitle {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .runTitle > strong {
            font-size: 14px;
          }

          .runHeader p {
            margin: 4px 0 0;
            color: #94a3b8;
            font-size: 9px;
          }

          .status,
          .jobStatus {
            border-radius: 999px;
            padding: 4px 7px;
            background: #f1f5f9;
            color: #64748b;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .status.completed,
          .jobStatus.completed {
            background: #dcfce7;
            color: #15803d;
          }

          .status.processing,
          .status.submitting,
          .jobStatus.processing,
          .jobStatus.submitting {
            background: #dbeafe;
            color: #1d4ed8;
          }

          .status.failed,
          .jobStatus.failed {
            background: #fee2e2;
            color: #b91c1c;
          }

          .runStats {
            display: flex;
            gap: 8px;
          }

          .runStats > div {
            min-width: 68px;
            padding: 7px 9px;
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            background: #f8fafc;
          }

          .runStats span,
          .runStats strong {
            display: block;
          }

          .runStats span {
            color: #94a3b8;
            font-size: 8px;
            font-weight: 700;
          }

          .runStats strong {
            margin-top: 3px;
            font-size: 11px;
          }

          .jobsGrid {
            margin-top: 13px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 7px;
          }

          .jobCard {
            min-height: 92px;
            padding: 9px;
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            background: #f8fafc;
          }

          .jobTop {
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }

          .jobTop strong {
            font-size: 9px;
            line-height: 1.35;
          }

          .jobMeta {
            margin-top: 6px;
            color: #64748b;
            font-size: 8px;
          }

          .jobError {
            margin-top: 7px;
            color: #b91c1c;
            font-size: 8px;
            line-height: 1.4;
          }

          .jobCard a {
            display: inline-block;
            margin-top: 9px;
            color: #1d4ed8;
            font-size: 9px;
            font-weight: 700;
            text-decoration: none;
          }

          .empty {
            min-height: 240px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border: 1px solid #dbe3ee;
            border-radius: 10px;
            background: white;
            color: #64748b;
            font-size: 11px;
          }

          .empty.error {
            border-color: #fecaca;
            color: #991b1b;
          }

          @media (max-width: 1000px) {
            .jobsGrid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .runHeader {
              flex-direction: column;
            }
          }

          @media (max-width: 650px) {
            .page {
              padding: 18px;
            }

            .jobsGrid {
              grid-template-columns: 1fr;
            }

            .runStats {
              flex-wrap: wrap;
            }
          }
        `}</style>
      </main>
    </NdWorkspaceShell>
  );
}
