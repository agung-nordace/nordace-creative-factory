"use client";

import { useEffect, useMemo, useState } from "react";

type Asset = {
  id: number;
  generation_job_id: number;
  generation_run_id: number;
  title: string | null;
  creative_model_name: string | null;
  archetype_name: string | null;
  concept_name: string | null;
  ratio: string | null;
  image_url: string;
  prompt?: string | null;
};

type Job = {
  id: number;
  run_id: number;
  job_index: number;
  status: string;
  ratio: string | null;
  output_url?: string | null;
  prompt?: string | null;
  creative_model_id?: string | null;
  creative_model_name?: string | null;
  provider_request?: Record<string, any> | null;
  error?: string | null;
};

const RATIOS = [
  { id: "1:1", label: "Square", detail: "1:1" },
  { id: "4:5", label: "Meta Feed", detail: "4:5" },
  { id: "1.91:1", label: "Landscape", detail: "1.91:1" },
  { id: "9:16", label: "Stories / Reels", detail: "9:16" },
];

export default function RepurposePage() {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [selectedRatios, setSelectedRatios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [savedJobIds, setSavedJobIds] = useState<number[]>([]);

  const assetId =
    typeof window !== "undefined"
      ? Number(
          new URLSearchParams(window.location.search).get("asset_id")
        )
      : NaN;

  useEffect(() => {
    (async () => {
      try {
        if (!Number.isFinite(assetId)) {
          throw new Error("Missing asset_id.");
        }

        const response = await fetch(
          `/api/library/generated-creatives?asset_id=${assetId}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success || !result.data?.[0]) {
          throw new Error(
            result.error || "Creative asset not found."
          );
        }

        const loaded = result.data[0] as Asset;
        setAsset(loaded);

        setSelectedRatios(
          RATIOS
            .map((ratio) => ratio.id)
            .filter((ratio) => ratio !== loaded.ratio)
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : String(err)
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [assetId]);

  const finished =
    jobs.length > 0 &&
    jobs.every((job) =>
      ["completed", "failed"].includes(job.status)
    );

  async function saveCompletedJobs(nextJobs: Job[]) {
    if (!asset) return;

    for (const job of nextJobs) {
      if (
        job.status !== "completed" ||
        !job.output_url ||
        savedJobIds.includes(job.id)
      ) {
        continue;
      }

      try {
        const plan =
          job.provider_request?._designer_plan || {};

        const response = await fetch(
          "/api/library/generated-creatives",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              generation_job_id: job.id,
              generation_run_id: job.run_id,
              title:
                `${asset.title || asset.creative_model_name || "Creative"} · ${job.ratio}`,
              creative_model_id:
                job.creative_model_id || null,
              creative_model_name:
                job.creative_model_name || null,
              archetype_name:
                plan.archetypeName ||
                asset.archetype_name ||
                null,
              concept_name:
                plan.conceptName ||
                asset.concept_name ||
                null,
              ratio: job.ratio,
              image_url: job.output_url,
              prompt: job.prompt || null,
              metadata: {
                designer_plan: plan,
                repurposed_from_asset_id: asset.id,
              },
            }),
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          setSavedJobIds((current) =>
            current.includes(job.id)
              ? current
              : [...current, job.id]
          );
        }
      } catch (err) {
        console.error(
          `Could not save repurposed job ${job.id}:`,
          err
        );
      }
    }
  }

  useEffect(() => {
    if (!runId || finished) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (stopped) return;

      try {
        const response = await fetch(
          `/api/generate/status?run_id=${runId}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Could not refresh repurpose run."
          );
        }

        const nextJobs = Array.isArray(result.jobs)
          ? result.jobs
          : [];

        setJobs(nextJobs);
        await saveCompletedJobs(nextJobs);

        const allDone =
          nextJobs.length > 0 &&
          nextJobs.every((job: Job) =>
            ["completed", "failed"].includes(job.status)
          );

        if (!allDone && !stopped) {
          timer = setTimeout(poll, 2200);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : String(err)
        );

        if (!stopped) {
          timer = setTimeout(poll, 3500);
        }
      }
    }

    poll();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, finished]);

  async function startRepurpose() {
    if (!asset || !selectedRatios.length || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setJobs([]);

    try {
      const response = await fetch("/api/generate/repurpose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asset_id: asset.id,
          ratios: selectedRatios,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Could not start repurpose."
        );
      }

      setRunId(Number(result.runId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSubmitting(false);
    }
  }

  const readyCount = useMemo(
    () =>
      jobs.filter((job) => job.status === "completed").length,
    [jobs]
  );

  if (loading) {
    return <main className="page">Loading creative...</main>;
  }

  if (!asset) {
    return (
      <main className="page">
        <div className="errorBox">{error || "Asset not found."}</div>
      </main>
    );
  }

  const sourcePreview =
    `/api/generate/image?url=${encodeURIComponent(asset.image_url)}`;

  return (
    <main className="page">
      <header className="header">
        <div>
          <div className="eyebrow">CREATIVE FACTORY</div>
          <h1>Repurpose Sizes</h1>
          <p>
            Recompose the approved creative for additional placements.
            This uses GPT Image edit — not crop/stretch.
          </p>
        </div>

        <a href="/generate?restore=1" className="back">
          ← Back to Generate
        </a>
      </header>

      <section className="sourceCard">
        <img src={sourcePreview} alt="Source creative" />

        <div>
          <span className="miniLabel">SOURCE CREATIVE</span>
          <h2>{asset.title || "Generated Creative"}</h2>
          <p>
            {asset.creative_model_name || "Creative"}
            {asset.archetype_name
              ? ` · ${asset.archetype_name}`
              : ""}
          </p>
          <div className="sourceRatio">
            Current ratio: <strong>{asset.ratio || "—"}</strong>
          </div>
        </div>
      </section>

      <section className="settings">
        <div className="sectionTitle">
          <span>1</span>
          <div>
            <h2>Select target sizes</h2>
            <p>
              The original copy, concept and product identity stay locked.
            </p>
          </div>
        </div>

        <div className="ratioGrid">
          {RATIOS.map((item) => {
            const current = item.id === asset.ratio;
            const selected = selectedRatios.includes(item.id);

            return (
              <button
                type="button"
                key={item.id}
                className={
                  current
                    ? "ratioCard current"
                    : selected
                      ? "ratioCard selected"
                      : "ratioCard"
                }
                disabled={current}
                onClick={() =>
                  setSelectedRatios((values) =>
                    values.includes(item.id)
                      ? values.filter((value) => value !== item.id)
                      : [...values, item.id]
                  )
                }
              >
                <strong>{item.detail}</strong>
                <span>{current ? "Current" : item.label}</span>
                {!current && (
                  <small>{selected ? "✓ Selected" : "Select"}</small>
                )}
              </button>
            );
          })}
        </div>

        <div className="lockNotice">
          <strong>Design Lock</strong>
          <span>
            Exact visible copy, selected product count/colors, campaign
            concept and product details are preserved. Composition is
            reflowed for each target ratio.
          </span>
        </div>

        <button
          className="generateButton"
          disabled={!selectedRatios.length || submitting}
          onClick={startRepurpose}
        >
          {submitting
            ? "Submitting..."
            : `✦ Generate ${selectedRatios.length} Repurposed Size${
                selectedRatios.length === 1 ? "" : "s"
              }`}
        </button>
      </section>

      {runId && (
        <section className="results">
          <div className="resultsHeader">
            <div>
              <div className="eyebrow">REPURPOSE RUN #{runId}</div>
              <h2>
                {readyCount}/{selectedRatios.length} ready
              </h2>
            </div>
          </div>

          {error && <div className="errorBox">{error}</div>}

          <div className="resultGrid">
            {selectedRatios.map((targetRatio, index) => {
              const job =
                jobs.find((item) => item.job_index === index) ||
                null;

              const previewUrl = job?.output_url
                ? `/api/generate/image?url=${encodeURIComponent(job.output_url)}`
                : null;

              const downloadUrl = job?.output_url
                ? `/api/generate/image?download=1&url=${encodeURIComponent(job.output_url)}`
                : null;

              return (
                <article className="resultCard" key={targetRatio}>
                  <div className="resultMedia">
                    {previewUrl ? (
                      <img src={previewUrl} alt={targetRatio} />
                    ) : (
                      <div className="placeholder">
                        <strong>{targetRatio}</strong>
                        <span>
                          {job?.status === "failed"
                            ? "Failed"
                            : "Generating..."}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="resultBody">
                    <strong>{targetRatio}</strong>
                    <span>
                      {job?.status || "queued"}
                    </span>

                    {previewUrl && downloadUrl && (
                      <div className="actions">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                        <a href={downloadUrl}>Download</a>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <style jsx>{`
        .page { min-height:100vh; padding:34px; background:#f8fafc; color:#0f172a; font-family:Arial,Helvetica,sans-serif; }
        .header { max-width:1200px; margin:0 auto 22px; display:flex; justify-content:space-between; gap:20px; }
        .eyebrow { color:#2563eb; font-size:11px; font-weight:900; letter-spacing:.1em; }
        h1 { margin:6px 0 6px; font-size:31px; }
        h2 { margin:0; }
        p { color:#64748b; line-height:1.5; }
        .back { height:fit-content; text-decoration:none; border:1px solid #cbd5e1; background:white; color:#334155; padding:10px 13px; border-radius:8px; font-size:12px; font-weight:800; }
        .sourceCard { max-width:1200px; margin:0 auto 18px; padding:14px; display:grid; grid-template-columns:180px 1fr; gap:18px; border:1px solid #dbe3ee; background:white; border-radius:12px; align-items:center; }
        .sourceCard img { width:180px; aspect-ratio:1/1; object-fit:contain; border-radius:8px; background:#eef2f7; }
        .miniLabel { color:#64748b; font-size:10px; font-weight:900; letter-spacing:.08em; }
        .sourceCard h2 { margin:6px 0; font-size:21px; }
        .sourceCard p { margin:0 0 10px; }
        .sourceRatio { font-size:12px; color:#475569; }
        .settings,.results { max-width:1200px; margin:0 auto 18px; border:1px solid #dbe3ee; background:white; border-radius:12px; padding:20px; }
        .sectionTitle { display:flex; gap:10px; margin-bottom:18px; align-items:flex-start; }
        .sectionTitle > span { display:grid; place-items:center; width:25px; height:25px; background:#2563eb; color:white; border-radius:50%; font-size:12px; font-weight:900; }
        .sectionTitle h2 { font-size:18px; }
        .sectionTitle p { margin:3px 0 0; font-size:12px; }
        .ratioGrid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .ratioCard { min-height:100px; border:1px solid #cbd5e1; background:white; border-radius:9px; padding:14px; text-align:left; cursor:pointer; }
        .ratioCard strong,.ratioCard span,.ratioCard small { display:block; }
        .ratioCard strong { font-size:20px; }
        .ratioCard span { margin-top:4px; font-size:12px; color:#64748b; }
        .ratioCard small { margin-top:12px; font-size:10px; font-weight:800; color:#2563eb; }
        .ratioCard.selected { border:2px solid #2563eb; background:#eff6ff; }
        .ratioCard.current { opacity:.55; cursor:not-allowed; background:#f1f5f9; }
        .lockNotice { margin:15px 0; padding:12px 14px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:8px; display:grid; gap:3px; }
        .lockNotice strong { font-size:12px; color:#1d4ed8; }
        .lockNotice span { font-size:12px; color:#475569; line-height:1.45; }
        .generateButton { width:100%; min-height:44px; border:0; border-radius:8px; background:#2563eb; color:white; font-weight:900; cursor:pointer; }
        .generateButton:disabled { opacity:.45; cursor:not-allowed; }
        .resultsHeader { margin-bottom:14px; }
        .resultsHeader h2 { margin-top:5px; font-size:22px; }
        .resultGrid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .resultCard { overflow:hidden; border:1px solid #dbe3ee; border-radius:10px; background:white; }
        .resultMedia { min-height:280px; display:grid; place-items:center; background:#eef2f7; }
        .resultMedia img { width:100%; max-height:430px; object-fit:contain; display:block; }
        .placeholder { min-height:280px; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#64748b; }
        .placeholder strong { font-size:25px; color:#0f172a; }
        .placeholder span { margin-top:5px; font-size:12px; }
        .resultBody { padding:12px; }
        .resultBody > strong,.resultBody > span { display:block; }
        .resultBody > span { margin-top:3px; color:#64748b; font-size:11px; }
        .actions { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:10px; }
        .actions a { text-align:center; padding:8px; border:1px solid #cbd5e1; border-radius:7px; text-decoration:none; color:#334155; font-size:11px; font-weight:800; }
        .errorBox { margin-bottom:14px; padding:12px; background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:8px; font-size:12px; }
        @media (max-width:800px) { .ratioGrid,.resultGrid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:560px) { .page { padding:18px; } .header { flex-direction:column; } .sourceCard { grid-template-columns:1fr; } .sourceCard img { width:100%; } .ratioGrid,.resultGrid { grid-template-columns:1fr; } }
      `}</style>
    </main>
  );
}
