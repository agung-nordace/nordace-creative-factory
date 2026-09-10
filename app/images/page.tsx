"use client";

import { useEffect, useMemo, useState } from "react";
import NdWorkspaceShell from "@/components/nd-workspace-shell";

type Creative = {
  id: number;
  name?: string | null;
  filename?: string | null;
  description?: string | null;
  type?: string | null;
  file_url?: string | null;
  thumbnail_url?: string | null;
  optimized_url?: string | null;
  image_url?: string | null;
  preview_url?: string | null;
  language?: string | null;
  product?: string | null;
  product_name?: string | null;
  team?: string | null;
  sprint?: string | null;
  width?: number | null;
  height?: number | null;
  [key: string]: any;
};

function getImageUrl(creative: Creative) {
  return (
    creative.optimized_url ||
    creative.thumbnail_url ||
    creative.file_url ||
    creative.preview_url ||
    creative.image_url ||
    ""
  );
}

function getName(creative: Creative) {
  return creative.name || creative.filename || `Creative ${creative.id}`;
}

function getProductLabel(creative: Creative) {
  return creative.product_name || creative.product || creative.type || "Creative";
}

export default function ImagesPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("");
  const [sprint, setSprint] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 24;

  async function loadCreatives(targetPage = page) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/library/creatives?page=${targetPage}&limit=${limit}`,
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok || !result?.success) {
        const message =
          typeof result?.error === "string"
            ? result.error
            : result?.error?.message
              ? String(result.error.message)
              : "Could not load Creative Library.";
        throw new Error(message);
      }

      const data = Array.isArray(result.data) ? result.data : [];
      setCreatives(data);

      const totalValue = Number(
        result.total ?? result.pagination?.total ?? result.meta?.total ?? NaN
      );
      setTotal(Number.isFinite(totalValue) ? totalValue : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCreatives(1);
  }, []);

  const teams = useMemo(
    () =>
      Array.from(
        new Set(
          creatives
            .map((item) => String(item.team || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [creatives]
  );

  const sprints = useMemo(
    () =>
      Array.from(
        new Set(
          creatives
            .map((item) => String(item.sprint || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [creatives]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return creatives.filter((creative) => {
      const matchesSearch =
        !query ||
        [
          creative.name,
          creative.filename,
          creative.product_name,
          creative.product,
          creative.description,
          creative.language,
          creative.team,
          creative.sprint,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesTeam = !team || String(creative.team || "") === team;
      const matchesSprint = !sprint || String(creative.sprint || "") === sprint;
      return matchesSearch && matchesTeam && matchesSprint;
    });
  }, [creatives, search, team, sprint]);

  const totalPages =
    total != null ? Math.max(1, Math.ceil(total / limit)) : null;

  return (
    <NdWorkspaceShell>
      <main className="imagesPage">
        <header className="topHeader">
          <div>
            <div className="eyebrow">CREATIVE ASSET LIBRARY</div>
            <h1>Creative Library</h1>
            <p>Live creative index powered by your existing Creative Library data.</p>
          </div>

          <button
            className="syncButton"
            onClick={() => loadCreatives(page)}
            disabled={loading}
          >
            ↻ {loading ? "Loading..." : "Refresh Creatives"}
          </button>
        </header>

        <section className="filterCard">
          <div className="searchBlock">
            <label>SEARCH CREATIVES</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search creatives..."
            />
          </div>

          <div>
            <label>TEAM</label>
            <select value={team} onChange={(event) => setTeam(event.target.value)}>
              <option value="">All Teams</option>
              {teams.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <div>
            <label>SPRINT</label>
            <select value={sprint} onChange={(event) => setSprint(event.target.value)}>
              <option value="">All Sprints</option>
              {sprints.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <div className="resultBox">
            <label>RESULTS</label>
            <strong>{total != null ? total.toLocaleString() : filtered.length}</strong>
            <span>creatives</span>
          </div>
        </section>

        <div className="listMeta">
          <span>{team || "All Teams"} / {sprint || "All Sprints"}</span>
          <span>Page {page}{totalPages ? ` of ${totalPages}` : ""}</span>
        </div>

        {error ? (
          <div className="errorBox">
            <strong>Could not load images.</strong>
            <span>{error}</span>
            <button onClick={() => loadCreatives(page)}>Try Again</button>
          </div>
        ) : loading ? (
          <div className="loadingGrid">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="skeleton" />
            ))}
          </div>
        ) : (
          <section className="creativeGrid">
            {filtered.map((creative) => {
              const imageUrl = getImageUrl(creative);
              return (
                <article key={creative.id} className="creativeCard">
                  <div className="imageWrap">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={getName(creative)}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          const img = event.currentTarget;
                          const fallback =
                            creative.file_url || creative.thumbnail_url || creative.image_url || "";
                          if (fallback && img.src !== fallback) img.src = fallback;
                        }}
                      />
                    ) : (
                      <div className="noImage">No preview</div>
                    )}
                  </div>

                  <div className="cardBody">
                    <strong className="creativeName" title={getName(creative)}>
                      {getName(creative)}
                    </strong>

                    <div className="creativeMeta">
                      <span>{creative.language || "—"} · {getProductLabel(creative)}</span>
                      <span>
                        {creative.width && creative.height
                          ? `${creative.width}×${creative.height}`
                          : ""}
                      </span>
                    </div>

                    <div className="cardActions">
                      <a href={imageUrl || "#"} target="_blank" rel="noreferrer">Open</a>
                      <button
                        onClick={() => {
                          window.location.href = `/generate?winning_creative_id=${creative.id}`;
                        }}
                      >
                        Use Creative
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <div className="pagination">
          <button
            disabled={page <= 1 || loading}
            onClick={() => {
              const next = page - 1;
              setPage(next);
              loadCreatives(next);
              window.scrollTo({ top: 0 });
            }}
          >
            ← Previous
          </button>

          <span>Page {page}{totalPages ? ` / ${totalPages}` : ""}</span>

          <button
            disabled={loading || (totalPages != null && page >= totalPages)}
            onClick={() => {
              const next = page + 1;
              setPage(next);
              loadCreatives(next);
              window.scrollTo({ top: 0 });
            }}
          >
            Next →
          </button>
        </div>

        <style jsx>{`
          .imagesPage { min-height:100vh; padding:31px 34px 50px; background:#f8fafc; color:#0f172a; }
          .topHeader { max-width:1500px; margin:0 auto 20px; display:flex; justify-content:space-between; align-items:flex-start; gap:20px; }
          .eyebrow { color:#2563eb; font-size:10px; font-weight: 700; letter-spacing:.1em; }
          h1 { margin:7px 0 5px; font-size:31px; letter-spacing:-.025em; }
          .topHeader p { margin:0; color:#64748b; font-size:13px; }
          .syncButton { min-height:40px; border:1px solid #2563eb; border-radius:7px; padding:0 13px; background:#2563eb; color:#fff; font-size:11px; font-weight: 700; cursor:pointer; }
          .filterCard { max-width:1500px; margin:0 auto 18px; display:grid; grid-template-columns:minmax(260px,1fr) minmax(190px,.7fr) minmax(190px,.7fr) auto; gap:11px; padding:14px; border:1px solid #cbd5e1; border-radius:9px; background:#fff; }
          label { display:block; margin-bottom:6px; color:#475569; font-size:9px; font-weight: 700; letter-spacing:.06em; }
          input,select { width:100%; height:40px; border:1px solid #94a3b8; border-radius:6px; padding:0 11px; background:#fff; color:#0f172a; font-size:12px; }
          .resultBox { min-width:128px; padding:0 12px; display:flex; flex-direction:column; justify-content:center; border:1px solid #94a3b8; border-radius:6px; background:#fff; }
          .resultBox label { margin-bottom:1px; }.resultBox strong { font-size:14px; }.resultBox span { color:#64748b; font-size:9px; }
          .listMeta { max-width:1500px; margin:0 auto 10px; display:flex; justify-content:space-between; color:#64748b; font-size:10px; font-weight: 700; }
          .creativeGrid,.loadingGrid { max-width:1500px; margin:0 auto; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
          .creativeCard { overflow:hidden; border:1px solid #94a3b8; border-radius:9px; background:#fff; }
          .imageWrap { aspect-ratio:1/1; background:#eef2f7; overflow:hidden; }
          .imageWrap img { width:100%; height:100%; display:block; object-fit:cover; }
          .noImage { width:100%; height:100%; display:grid; place-items:center; color:#94a3b8; font-size:11px; }
          .cardBody { padding:11px; }.creativeName { display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:11px; }
          .creativeMeta { margin-top:7px; display:flex; justify-content:space-between; gap:8px; color:#64748b; font-size:9px; }
          .cardActions { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:10px; }
          .cardActions a,.cardActions button { min-height:34px; display:flex; align-items:center; justify-content:center; border:1px solid #64748b; border-radius:6px; background:#fff; color:#0f172a; text-decoration:none; font-size:10px; font-weight: 700; cursor:pointer; }
          .cardActions button { border-color:#2563eb; background:#2563eb; color:#fff; }
          .pagination { max-width:1500px; margin:19px auto 0; display:flex; justify-content:center; align-items:center; gap:12px; }
          .pagination button { min-height:36px; border:1px solid #cbd5e1; border-radius:7px; padding:0 12px; background:#fff; font-size:10px; font-weight: 700; cursor:pointer; }
          .pagination button:disabled { opacity:.4; cursor:not-allowed; }.pagination span { color:#64748b; font-size:10px; }
          .errorBox { max-width:1500px; margin:0 auto; min-height:220px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; border:1px solid #fecaca; border-radius:9px; background:#fff; color:#991b1b; text-align:center; }
          .errorBox span { max-width:650px; font-size:11px; }.errorBox button { min-height:34px; border:0; border-radius:6px; padding:0 12px; background:#2563eb; color:#fff; font-size:10px; font-weight: 700; }
          .skeleton { aspect-ratio:1/1.24; border-radius:9px; background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 37%,#e2e8f0 63%); background-size:400% 100%; animation:pulse 1.3s ease infinite; }
          @keyframes pulse { 0%{background-position:100% 0} 100%{background-position:0 0} }
          @media (max-width:1200px){.creativeGrid,.loadingGrid{grid-template-columns:repeat(3,minmax(0,1fr));}}
          @media (max-width:900px){.filterCard{grid-template-columns:1fr 1fr}.creativeGrid,.loadingGrid{grid-template-columns:repeat(2,minmax(0,1fr));}}
          @media (max-width:650px){.imagesPage{padding:18px}.topHeader{flex-direction:column}.filterCard,.creativeGrid,.loadingGrid{grid-template-columns:1fr}}
        `}</style>
      </main>
    </NdWorkspaceShell>
  );
}
