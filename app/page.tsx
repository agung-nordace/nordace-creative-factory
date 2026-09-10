"use client";

import { useEffect, useMemo, useState } from "react";

type Team = {
  id: number;
  name: string;
  description?: string | null;
};

type Sprint = {
  id: number;
  team_id: number | null;
  name: string;
  description?: string | null;
};

type Creative = {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  file_url?: string | null;
  thumbnail_url?: string | null;
  optimized_url?: string | null;
  width?: number | null;
  height?: number | null;
  file_size?: number | null;
  mime_type?: string | null;
  team_id?: number | null;
  sprint_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  sprints?: {
    id: number;
    name: string;
    team_id: number | null;
  } | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);

  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedSprint, setSelectedSprint] = useState("all");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(24);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 24,
    total: 0,
    pages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [loadingCreatives, setLoadingCreatives] = useState(false);

  // ============================================================
  // LOAD TEAMS
  // ============================================================

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setLoadingTeams(true);

        const response = await fetch("/api/library/teams", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load teams");
        }

        setTeams(result.data ?? []);
      } catch (error) {
        console.error("Load teams error:", error);
        setTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    };

    loadTeams();
  }, []);

  // ============================================================
  // LOAD SPRINTS WHEN TEAM CHANGES
  // ============================================================

  useEffect(() => {
    const loadSprints = async () => {
      try {
        setLoadingSprints(true);

        const query =
          selectedTeam === "all"
            ? "/api/library/sprints"
            : `/api/library/sprints?team_id=${encodeURIComponent(
                selectedTeam
              )}`;

        const response = await fetch(query, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load sprints");
        }

        setSprints(result.data ?? []);
      } catch (error) {
        console.error("Load sprints error:", error);
        setSprints([]);
      } finally {
        setLoadingSprints(false);
      }
    };

    setSelectedSprint("all");
    setPage(1);

    loadSprints();
  }, [selectedTeam]);

  // ============================================================
  // LOAD CREATIVES
  // ============================================================

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoadingCreatives(true);

        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", String(limit));

        if (selectedTeam !== "all") {
          params.set("team_id", selectedTeam);
        }

        if (selectedSprint !== "all") {
          params.set("sprint_id", selectedSprint);
        }

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await fetch(
          `/api/library/creatives?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Failed to load creatives"
          );
        }

        setCreatives(result.data ?? []);

        setPagination(
          result.pagination ?? {
            page: 1,
            limit,
            total: 0,
            pages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        );
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Load creatives error:", error);
        setCreatives([]);
      } finally {
        setLoadingCreatives(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    selectedTeam,
    selectedSprint,
    search,
    page,
    limit,
  ]);

  // ============================================================
  // RESET PAGE WHEN FILTER CHANGES
  // ============================================================

  useEffect(() => {
    setPage(1);
  }, [selectedSprint, search]);

  const selectedTeamName = useMemo(() => {
    if (selectedTeam === "all") {
      return "All Teams";
    }

    return (
      teams.find(
        (team) => String(team.id) === selectedTeam
      )?.name ?? "Unknown Team"
    );
  }, [teams, selectedTeam]);

  const selectedSprintName = useMemo(() => {
    if (selectedSprint === "all") {
      return "All Sprints";
    }

    return (
      sprints.find(
        (sprint) => String(sprint.id) === selectedSprint
      )?.name ?? "Unknown Sprint"
    );
  }, [sprints, selectedSprint]);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">
            ND Creative Factory
          </div>

          <div className="brand-subtitle">
            Powered by Nordace Creative Data
          </div>
        </div>

        <nav className="nav">
          <button className="nav-item active">
            Dashboard
          </button>

          <button className="nav-item">
            Images
          </button>

          <button className="nav-item">
            Products
          </button>

          <button className="nav-item">
            Workflows
          </button>

          <button className="nav-item">
            Generate
          </button>

          <button className="nav-item">
            Jobs
          </button>

          <button className="nav-item">
            Settings
          </button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <input
            className="top-search"
            type="text"
            placeholder="Search creatives..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          <div className="profile">
            <div className="profile-text">
              <strong>Creative Factory</strong>
              <span>Nordace</span>
            </div>

            <div className="avatar">CF</div>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <h1>Creative Library</h1>

            <p>
              Live creative index powered by
              images.nordace.com
            </p>
          </div>

          <div className="filter-card">
            <div className="filter-field">
              <label>Team</label>

              <select
                value={selectedTeam}
                disabled={loadingTeams}
                onChange={(event) =>
                  setSelectedTeam(event.target.value)
                }
              >
                <option value="all">
                  {loadingTeams
                    ? "Loading teams..."
                    : "All Teams"}
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={String(team.id)}
                  >
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label>Sprint</label>

              <select
                value={selectedSprint}
                disabled={loadingSprints}
                onChange={(event) =>
                  setSelectedSprint(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  {loadingSprints
                    ? "Loading sprints..."
                    : "All Sprints"}
                </option>

                {sprints.map((sprint) => (
                  <option
                    key={sprint.id}
                    value={String(sprint.id)}
                  >
                    {sprint.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field results-field">
              <label>Results</label>

              <div className="results-pill">
                {loadingCreatives
                  ? "Loading..."
                  : `${pagination.total} creatives`}
              </div>
            </div>
          </div>

          <div className="context-row">
            <div>
              <strong>{selectedTeamName}</strong>
              <span> / </span>
              <strong>{selectedSprintName}</strong>
            </div>

            <div>
              Page {pagination.page} of{" "}
              {pagination.pages}
            </div>
          </div>

          {loadingCreatives && creatives.length === 0 ? (
            <div className="empty-state">
              Loading creatives...
            </div>
          ) : creatives.length === 0 ? (
            <div className="empty-state">
              No creatives found.
            </div>
          ) : (
            <div className="creative-grid">
              {creatives.map((creative) => {
                const preview =
                  creative.thumbnail_url ||
                  creative.optimized_url ||
                  creative.file_url ||
                  "";

                const isVideo =
                  creative.mime_type?.startsWith(
                    "video/"
                  ) ||
                  creative.type === "mp4";

                return (
                  <article
                    key={creative.id}
                    className="creative-card"
                  >
                    <div className="creative-preview">
                      {isVideo ? (
                        <video
                          src={creative.file_url || ""}
                          poster={
                            creative.thumbnail_url ||
                            undefined
                          }
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={preview}
                          alt={creative.name}
                          loading="lazy"
                        />
                      )}
                    </div>

                    <div className="creative-body">
                      <div className="creative-name">
                        {creative.name}
                      </div>

                      <div className="creative-meta">
                        <span>
                          {creative.sprints?.name ||
                            "Unassigned"}
                        </span>

                        <span>
                          {creative.width &&
                          creative.height
                            ? `${creative.width}×${creative.height}`
                            : creative.mime_type ||
                              creative.type ||
                              "Creative"}
                        </span>
                      </div>

                      <div className="creative-actions">
                        <a
                          href={
                            creative.file_url || "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="secondary-button"
                        >
                          Open
                        </a>

                        <button
                          className="primary-button"
                          onClick={() => {
                            localStorage.setItem(
                              "selectedCreative",
                              JSON.stringify(creative)
                            );

                            alert(
                              `Selected: ${creative.name}`
                            );
                          }}
                        >
                          Use Creative
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                disabled={
                  !pagination.hasPreviousPage ||
                  loadingCreatives
                }
                onClick={() =>
                  setPage((current) =>
                    Math.max(current - 1, 1)
                  )
                }
              >
                ← Previous
              </button>

              <div>
                Page <strong>{pagination.page}</strong>{" "}
                of{" "}
                <strong>{pagination.pages}</strong>
              </div>

              <button
                disabled={
                  !pagination.hasNextPage ||
                  loadingCreatives
                }
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #f7f8fa;
          color: #111827;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .app-shell {
          min-height: 100vh;
          display: flex;
        }

        .sidebar {
          width: 240px;
          min-height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          border-right: 1px solid #d9dde5;
          background: white;
          padding: 30px 20px;
          z-index: 20;
        }

        .brand {
          margin-bottom: 30px;
        }

        .brand-title {
          font-size: 21px;
          font-weight: 700;
        }

        .brand-subtitle {
          margin-top: 6px;
          font-size: 12px;
          color: #64748b;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .nav-item {
          border: 0;
          background: transparent;
          text-align: left;
          padding: 12px 14px;
          border-radius: 8px;
          cursor: pointer;
          color: #334155;
        }

        .nav-item:hover {
          background: #f3f6fb;
        }

        .nav-item.active {
          background: #eaf2ff;
          color: #165dff;
        }

        .main {
          margin-left: 240px;
          width: calc(100% - 240px);
          min-height: 100vh;
        }

        .topbar {
          height: 90px;
          background: white;
          border-bottom: 1px solid #d9dde5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .top-search {
          width: min(520px, 50vw);
          height: 42px;
          border: 1px solid #9aa4b2;
          border-radius: 7px;
          padding: 0 15px;
          outline: none;
        }

        .top-search:focus {
          border-color: #165dff;
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .profile-text {
          display: flex;
          flex-direction: column;
          text-align: right;
          font-size: 12px;
        }

        .profile-text span {
          color: #64748b;
          margin-top: 2px;
        }

        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #165dff;
          color: white;
          display: grid;
          place-items: center;
          font-weight: 700;
        }

        .content {
          padding: 34px 32px 60px;
          max-width: 1500px;
          margin: 0 auto;
        }

        .page-heading h1 {
          margin: 0;
          font-size: 34px;
        }

        .page-heading p {
          margin: 8px 0 0;
          color: #64748b;
        }

        .filter-card {
          margin-top: 28px;
          padding: 18px;
          background: white;
          border: 1px solid #b8c0cc;
          border-radius: 12px;
          display: grid;
          grid-template-columns:
            minmax(200px, 1fr)
            minmax(200px, 1fr)
            auto;
          gap: 16px;
          align-items: end;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .filter-field label {
          font-size: 12px;
          color: #475569;
        }

        .filter-field select {
          height: 42px;
          border: 1px solid #64748b;
          border-radius: 7px;
          padding: 0 12px;
          background: white;
        }

        .results-pill {
          min-width: 125px;
          height: 42px;
          border: 1px solid #64748b;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .context-row {
          margin: 22px 0 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: #64748b;
        }

        .creative-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(260px, 1fr)
            );
          gap: 22px;
        }

        .creative-card {
          background: white;
          border: 1px solid #94a3b8;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .creative-preview {
          width: 100%;
          aspect-ratio: 1 / 1;
          background: #edf0f4;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .creative-preview img,
        .creative-preview video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .creative-body {
          padding: 15px;
        }

        .creative-name {
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 9px;
        }

        .creative-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 12px;
          color: #64748b;
          min-height: 18px;
        }

        .creative-meta span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .creative-actions {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .creative-actions a,
        .creative-actions button {
          height: 38px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-decoration: none;
          font-size: 13px;
        }

        .secondary-button {
          border: 1px solid #64748b;
          background: white;
          color: #111827;
        }

        .primary-button {
          border: 1px solid #165dff;
          background: #165dff;
          color: white;
        }

        .empty-state {
          min-height: 320px;
          display: grid;
          place-items: center;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          background: white;
          color: #64748b;
        }

        .pagination {
          margin-top: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }

        .pagination button {
          min-width: 120px;
          height: 40px;
          background: white;
          border: 1px solid #94a3b8;
          border-radius: 7px;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }

          .main {
            margin-left: 0;
            width: 100%;
          }

          .topbar {
            padding: 0 18px;
          }

          .content {
            padding: 24px 18px 50px;
          }

          .filter-card {
            grid-template-columns: 1fr;
          }

          .creative-grid {
            grid-template-columns:
              repeat(
                auto-fill,
                minmax(220px, 1fr)
              );
          }
        }
      `}</style>
    </div>
  );
}