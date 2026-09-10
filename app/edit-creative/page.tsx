"use client";

import { useEffect, useState } from "react";

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

const QUICK_EDITS = [
  "Remove the offer badge but keep everything else unchanged.",
  "Make the headline larger and improve hierarchy without covering the product.",
  "Keep the same design but make the background feel more premium and realistic.",
  "Move the product slightly lower and create more clean negative space for the headline.",
];

export default function EditCreativePage() {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<number | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [savedAssetId, setSavedAssetId] = useState<number | null>(null);

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

        setAsset(result.data[0]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : String(err)
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [assetId]);

  useEffect(() => {
    if (!runId || job?.status === "completed" || job?.status === "failed") {
      return;
    }

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
            result.error || "Could not refresh edit run."
          );
        }

        const nextJob =
          Array.isArray(result.jobs) && result.jobs.length
            ? result.jobs[0]
            : null;

        setJob(nextJob);

        if (
          nextJob?.status === "completed" &&
          nextJob?.output_url &&
          asset &&
          !savedAssetId
        ) {
          const plan =
            nextJob.provider_request?._designer_plan || {};

          const saveResponse = await fetch(
            "/api/library/generated-creatives",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                generation_job_id: nextJob.id,
                generation_run_id: nextJob.run_id,
                title:
                  `${asset.title || asset.creative_model_name || "Creative"} · Edited`,
                creative_model_id:
                  nextJob.creative_model_id || null,
                creative_model_name:
                  nextJob.creative_model_name || null,
                archetype_name:
                  plan.archetypeName ||
                  asset.archetype_name ||
                  null,
                concept_name:
                  plan.conceptName ||
                  asset.concept_name ||
                  null,
                ratio: nextJob.ratio || asset.ratio,
                image_url: nextJob.output_url,
                prompt: nextJob.prompt || null,
                metadata: {
                  designer_plan: plan,
                  edited_from_asset_id: asset.id,
                  edit_instruction: instruction,
                },
              }),
            }
          );

          const saveResult = await saveResponse.json();

          if (
            saveResponse.ok &&
            saveResult.success &&
            saveResult.asset
          ) {
            setSavedAssetId(saveResult.asset.id);
          }
        }

        const terminal =
          nextJob &&
          ["completed", "failed"].includes(nextJob.status);

        if (!terminal && !stopped) {
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
  }, [runId, job?.status, asset, savedAssetId, instruction]);

  async function submitEdit() {
    if (!asset || !instruction.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setRunId(null);
    setJob(null);
    setSavedAssetId(null);

    try {
      const response = await fetch("/api/generate/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asset_id: asset.id,
          instruction: instruction.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Could not submit creative edit."
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

  const resultPreview = job?.output_url
    ? `/api/generate/image?url=${encodeURIComponent(job.output_url)}`
    : null;

  const resultDownload = job?.output_url
    ? `/api/generate/image?download=1&url=${encodeURIComponent(job.output_url)}`
    : null;

  return (
    <main className="page">
      <header className="header">
        <div>
          <div className="eyebrow">CREATIVE FACTORY</div>
          <h1>Edit Creative</h1>
          <p>
            Revise the approved creative while preserving its product lock
            and campaign identity.
          </p>
        </div>

        <a href="/generate?restore=1" className="back">
          ← Back to Generate
        </a>
      </header>

      <section className="workspace">
        <div className="sourcePanel">
          <div className="panelLabel">SOURCE CREATIVE</div>
          <img src={sourcePreview} alt="Source creative" />
          <h2>{asset.title || "Generated Creative"}</h2>
          <p>
            {asset.creative_model_name || "Creative"}
            {asset.archetype_name
              ? ` · ${asset.archetype_name}`
              : ""}
            {asset.ratio ? ` · ${asset.ratio}` : ""}
          </p>
        </div>

        <div className="editorPanel">
          <div className="sectionTitle">
            <span>1</span>
            <div>
              <h2>Revision instruction</h2>
              <p>
                Be specific. The engine changes only what you request and
                keeps the rest locked.
              </p>
            </div>
          </div>

          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Example: Replace the headline with “One Tote. No Second Carry-On.” Keep the product, purple color, airport setting and 35% OFF badge unchanged. Move the headline to the upper-left and keep it clear of the handles."
          />

          <div className="quickLabel">QUICK EDITS</div>
          <div className="quickGrid">
            {QUICK_EDITS.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setInstruction(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="lockNotice">
            <strong>Strict Edit Lock</strong>
            <span>
              Unless requested otherwise, existing copy, product count,
              selected color, product details, concept and ratio remain
              unchanged.
            </span>
          </div>

          <button
            className="generateButton"
            disabled={!instruction.trim() || submitting || Boolean(runId && job?.status !== "completed" && job?.status !== "failed")}
            onClick={submitEdit}
          >
            {submitting
              ? "Submitting..."
              : runId && job?.status !== "completed" && job?.status !== "failed"
                ? "Editing..."
                : "✦ Generate Edited Creative"}
          </button>

          {error && <div className="errorBox">{error}</div>}
        </div>
      </section>

      {runId && (
        <section className="resultSection">
          <div className="sectionTitle">
            <span>2</span>
            <div>
              <h2>Edited result</h2>
              <p>
                Run #{runId} · {job?.status || "processing"}
              </p>
            </div>
          </div>

          <div className="resultCard">
            <div className="resultMedia">
              {resultPreview ? (
                <img src={resultPreview} alt="Edited creative" />
              ) : (
                <div className="placeholder">
                  <strong>
                    {job?.status === "failed"
                      ? "Edit failed"
                      : "Generating edited creative..."}
                  </strong>
                  {job?.error && <span>{job.error}</span>}
                </div>
              )}
            </div>

            {resultPreview && resultDownload && (
              <div className="resultActions">
                <a
                  href={resultPreview}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Final
                </a>
                <a href={resultDownload}>Download</a>
                {savedAssetId ? (
                  <a
                    className="libraryAction"
                    href={`/generated-library?asset_id=${savedAssetId}`}
                  >
                    View in Library
                  </a>
                ) : (
                  <button disabled>Saving to Library...</button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <style jsx>{`
        .page { min-height:100vh; padding:34px; background:#f8fafc; color:#0f172a; font-family:Arial,Helvetica,sans-serif; }
        .header { max-width:1250px; margin:0 auto 22px; display:flex; justify-content:space-between; gap:20px; }
        .eyebrow { color:#2563eb; font-size:11px; font-weight:900; letter-spacing:.1em; }
        h1 { margin:6px 0 6px; font-size:31px; }
        h2 { margin:0; }
        p { color:#64748b; line-height:1.5; }
        .back { height:fit-content; text-decoration:none; border:1px solid #cbd5e1; background:white; color:#334155; padding:10px 13px; border-radius:8px; font-size:12px; font-weight:800; }
        .workspace { max-width:1250px; margin:0 auto 18px; display:grid; grid-template-columns:minmax(320px,.8fr) minmax(480px,1.2fr); gap:16px; }
        .sourcePanel,.editorPanel,.resultSection { border:1px solid #dbe3ee; background:white; border-radius:12px; padding:18px; }
        .panelLabel,.quickLabel { color:#64748b; font-size:10px; font-weight:900; letter-spacing:.08em; }
        .sourcePanel img { width:100%; max-height:650px; object-fit:contain; display:block; margin:12px 0; border-radius:8px; background:#eef2f7; }
        .sourcePanel h2 { font-size:18px; }
        .sourcePanel p { margin:4px 0 0; font-size:12px; }
        .sectionTitle { display:flex; gap:10px; margin-bottom:14px; align-items:flex-start; }
        .sectionTitle > span { display:grid; place-items:center; width:25px; height:25px; border-radius:50%; background:#2563eb; color:white; font-size:12px; font-weight:900; }
        .sectionTitle h2 { font-size:18px; }
        .sectionTitle p { margin:3px 0 0; font-size:12px; }
        textarea { width:100%; min-height:190px; resize:vertical; border:1px solid #cbd5e1; border-radius:9px; padding:14px; font:inherit; font-size:14px; line-height:1.55; outline:none; box-sizing:border-box; }
        textarea:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.08); }
        .quickLabel { margin:15px 0 8px; }
        .quickGrid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .quickGrid button { min-height:60px; text-align:left; border:1px solid #dbe3ee; background:#f8fafc; border-radius:8px; padding:10px 11px; color:#475569; font-size:11px; line-height:1.4; cursor:pointer; }
        .quickGrid button:hover { border-color:#93c5fd; background:#eff6ff; color:#1d4ed8; }
        .lockNotice { margin:15px 0; padding:12px 14px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:8px; display:grid; gap:3px; }
        .lockNotice strong { color:#1d4ed8; font-size:12px; }
        .lockNotice span { color:#475569; font-size:12px; line-height:1.45; }
        .generateButton { width:100%; min-height:44px; border:0; border-radius:8px; background:#2563eb; color:white; font-weight:900; cursor:pointer; }
        .generateButton:disabled { opacity:.45; cursor:not-allowed; }
        .errorBox { margin-top:12px; padding:12px; background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:8px; font-size:12px; }
        .resultSection { max-width:1250px; margin:0 auto; }
        .resultCard { max-width:620px; border:1px solid #dbe3ee; border-radius:10px; overflow:hidden; background:white; }
        .resultMedia { min-height:420px; display:grid; place-items:center; background:#eef2f7; }
        .resultMedia img { width:100%; max-height:720px; object-fit:contain; display:block; }
        .placeholder { min-height:420px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:20px; text-align:center; color:#64748b; }
        .placeholder strong { color:#0f172a; }
        .placeholder span { font-size:11px; }
        .resultActions { padding:12px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .resultActions a,.resultActions button { min-height:38px; display:flex; align-items:center; justify-content:center; text-decoration:none; border:1px solid #cbd5e1; background:white; color:#334155; border-radius:7px; font-size:11px; font-weight:800; }
        .resultActions .libraryAction { grid-column:1 / -1; border-color:#bbf7d0; background:#f0fdf4; color:#166534; }
        .resultActions button { grid-column:1 / -1; opacity:.55; }
        @media (max-width:850px) { .workspace { grid-template-columns:1fr; } }
        @media (max-width:560px) { .page { padding:18px; } .header { flex-direction:column; } .quickGrid { grid-template-columns:1fr; } }
      `}</style>
    </main>
  );
}
