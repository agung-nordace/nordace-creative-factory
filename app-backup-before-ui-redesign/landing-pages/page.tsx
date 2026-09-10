"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type LandingPage = {
  id: number;
  url: string;
  slug: string | null;
  title: string | null;
  product_id: number | null;
  product_name: string | null;
  language: string | null;
  market: string | null;
  status: string | null;
  headline: string | null;
  subheadline: string | null;
  offer: string | null;
  body_text: string | null;
  metadata: Record<string, unknown> | null;
  analyzed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Product = {
  id: number;
  name: string;
  sku?: string | null;
  status?: string | null;
  kind?: "single" | "bundle" | "other";
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type BulkSyncResult = {
  success?: boolean;
  needsLogin?: boolean;
  error?: string;
  totalDetected?: number | null;
  uniqueDetected?: number;
  rowsSynced?: number;
  pagesVisited?: number;
  complete?: boolean | null;
};

type SyncProgress = {
  phase:
    | "idle"
    | "syncing"
    | "loading"
    | "analyzing"
    | "complete"
    | "error";
  message: string;
  total: number;
  processed: number;
  analyzed: number;
  skipped: number;
  failed: number;
};

export default function LandingPagesPage() {
  const [landingPages, setLandingPages] =
    useState<LandingPage[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 24,
      total: 0,
      pages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    selectedProductId,
    setSelectedProductId,
  ] = useState("");

  const [
    productSearch,
    setProductSearch,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    productsLoading,
    setProductsLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);

  const [newUrl, setNewUrl] =
    useState("");

  const [importing, setImporting] =
    useState(false);

  const [
    importError,
    setImportError,
  ] = useState("");

  const [
    reanalyzingId,
    setReanalyzingId,
  ] = useState<number | null>(null);

  const [
    bulkSyncing,
    setBulkSyncing,
  ] = useState(false);

  const [
    syncProgress,
    setSyncProgress,
  ] = useState<SyncProgress>({
    phase: "idle",
    message: "",
    total: 0,
    processed: 0,
    analyzed: 0,
    skipped: 0,
    failed: 0,
  });

  const [
    lastSyncResult,
    setLastSyncResult,
  ] = useState<BulkSyncResult | null>(null);

  // ============================================================
  // LOAD ALL PRODUCTS FOR FILTER
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setProductsLoading(true);

      try {
        const response =
          await fetch(
            "/api/library/product-options",
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Failed to load products."
          );
        }

        if (!cancelled) {
          setProducts(
            result.data ?? []
          );
        }
      } catch (err) {
        console.error(
          "Failed loading product options:",
          err
        );
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // PRODUCT SEARCH
  // ============================================================

  const filteredProducts =
    useMemo(() => {
      const q =
        productSearch
          .trim()
          .toLowerCase();

      if (!q) {
        return products;
      }

      return products.filter(
        (product) => {
          const name =
            product.name
              ?.toLowerCase() ?? "";

          const sku =
            product.sku
              ?.toLowerCase() ?? "";

          return (
            name.includes(q) ||
            sku.includes(q)
          );
        }
      );
    }, [
      products,
      productSearch,
    ]);

  const selectedProduct =
    useMemo(() => {
      if (!selectedProductId) {
        return null;
      }

      return (
        products.find(
          (product) =>
            String(product.id) ===
            selectedProductId
        ) ?? null
      );
    }, [
      products,
      selectedProductId,
    ]);

  // ============================================================
  // LOAD LANDING PAGES
  // ============================================================

  const loadLandingPages =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams({
            page: String(page),
            limit: "24",
          });

        if (search) {
          params.set(
            "search",
            search
          );
        }

        if (selectedProductId) {
          params.set(
            "product_id",
            selectedProductId
          );
        }

        const response =
          await fetch(
            `/api/library/landing-pages?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Failed to load landing pages."
          );
        }

        setLandingPages(
          result.data ?? []
        );

        setPagination(
          result.pagination
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
    }, [
      page,
      search,
      selectedProductId,
    ]);

  useEffect(() => {
    loadLandingPages();
  }, [loadLandingPages]);

  // ============================================================
  // SEARCH / FILTER
  // ============================================================

  function submitSearch(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setPage(1);

    setSearch(
      searchInput.trim()
    );
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  function handleProductFilter(
    value: string
  ) {
    setSelectedProductId(
      value
    );

    setPage(1);
  }

  function clearAllFilters() {
    setSearchInput("");
    setSearch("");
    setProductSearch("");
    setSelectedProductId("");
    setPage(1);
  }

  // ============================================================
  // IMPORT LP
  // ============================================================

  async function importLandingPage() {
    const url =
      newUrl.trim();

    if (!url) {
      setImportError(
        "Paste a landing page URL first."
      );

      return;
    }

    setImporting(true);
    setImportError("");

    try {
      const response =
        await fetch(
          "/api/local-import/landing-page",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                url,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Landing page import failed."
        );
      }

      setNewUrl("");
      setShowAddModal(false);
      setPage(1);

      await loadLandingPages();
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : String(err)
      );
    } finally {
      setImporting(false);
    }
  }

  // ============================================================
  // REANALYZE
  // ============================================================

  async function reanalyzeLandingPage(
    item: LandingPage
  ) {
    setReanalyzingId(
      item.id
    );

    try {
      const response =
        await fetch(
          "/api/local-import/landing-page",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                url: item.url,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Re-analysis failed."
        );
      }

      await loadLandingPages();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : String(err)
      );
    } finally {
      setReanalyzingId(
        null
      );
    }
  }


  // ============================================================
  // BULK SYNC + AUTO ANALYZE
  // ============================================================

  function needsAnalysis(
    item: LandingPage
  ) {
    return (
      !item.analyzed_at ||
      !item.product_name ||
      !item.headline ||
      !item.body_text
    );
  }

  async function analyzeOneLandingPage(
    item: LandingPage
  ) {
    const response =
      await fetch(
        "/api/local-import/landing-page",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            url: item.url,
          }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.error ||
          "Landing page analysis failed."
      );
    }
  }

  async function loadAllLandingPagesForAnalysis() {
    const all: LandingPage[] = [];
    const limit = 100;
    let currentPage = 1;
    let totalPages = 1;

    setSyncProgress((current) => ({
      ...current,
      phase: "loading",
      message:
        "Loading synced landing pages and checking which ones still need analysis...",
    }));

    do {
      const params =
        new URLSearchParams({
          page: String(currentPage),
          limit: String(limit),
        });

      const response =
        await fetch(
          `/api/library/landing-pages?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Failed to load landing pages for auto-analysis."
        );
      }

      const batch: LandingPage[] =
        result.data ?? [];

      all.push(...batch);

      totalPages =
        Math.max(
          1,
          Number(
            result.pagination?.pages ??
              1
          )
        );

      setSyncProgress((current) => ({
        ...current,
        message:
          `Loading Landing Page Library... page ${currentPage} of ${totalPages}`,
      }));

      currentPage += 1;
    } while (
      currentPage <= totalPages
    );

    return all;
  }

  async function autoAnalyzeLandingPages() {
    const all =
      await loadAllLandingPagesForAnalysis();

    const pending =
      all.filter(
        needsAnalysis
      );

    setSyncProgress((current) => ({
      ...current,
      phase: "analyzing",
      message:
        pending.length > 0
          ? `Auto-analyzing ${pending.length} new or incomplete landing pages...`
          : "All landing pages are already analyzed.",
      total: pending.length,
      processed: 0,
      analyzed: 0,
      skipped:
        all.length -
        pending.length,
      failed: 0,
    }));

    if (
      pending.length === 0
    ) {
      return;
    }

    let analyzed = 0;
    let failed = 0;

    // Small concurrency keeps the local machine responsive
    // while still making a large first-time analysis much faster.
    const concurrency = 3;

    for (
      let index = 0;
      index < pending.length;
      index += concurrency
    ) {
      const chunk =
        pending.slice(
          index,
          index + concurrency
        );

      await Promise.all(
        chunk.map(
          async (item) => {
            try {
              await analyzeOneLandingPage(
                item
              );

              analyzed += 1;
            } catch (error) {
              failed += 1;

              console.error(
                "Auto-analysis failed:",
                item.url,
                error
              );
            } finally {
              setSyncProgress(
                (current) => ({
                  ...current,
                  phase:
                    "analyzing",
                  processed:
                    analyzed +
                    failed,
                  analyzed,
                  failed,
                  message:
                    `Analyzing landing pages... ${analyzed + failed} of ${pending.length}`,
                })
              );
            }
          }
        )
      );
    }
  }

  async function syncAndAnalyzeLandingPages() {
    if (bulkSyncing) {
      return;
    }

    const isLocal =
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1";

    if (!isLocal) {
      alert(
        "Landing Page sync is available from localhost only."
      );

      return;
    }

    setBulkSyncing(true);
    setLastSyncResult(null);

    setSyncProgress({
      phase: "syncing",
      message:
        "Syncing landing page index from Nordace Landing Platform...",
      total: 0,
      processed: 0,
      analyzed: 0,
      skipped: 0,
      failed: 0,
    });

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
            body:
              JSON.stringify({}),
          }
        );

      const result =
        (await response.json()) as BulkSyncResult;

      setLastSyncResult(
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Landing Page sync failed."
        );
      }

      setSyncProgress(
        (current) => ({
          ...current,
          phase: "loading",
          message:
            `Index sync complete. ${result.rowsSynced ?? result.uniqueDetected ?? 0} landing pages synced. Preparing auto-analysis...`,
        })
      );

      await autoAnalyzeLandingPages();

      setSyncProgress(
        (current) => ({
          ...current,
          phase: "complete",
          message:
            current.failed > 0
              ? `Sync complete with ${current.failed} analysis failure${current.failed === 1 ? "" : "s"}.`
              : "Sync and auto-analysis complete.",
        })
      );

      setPage(1);

      await loadLandingPages();
    } catch (error) {
      setSyncProgress(
        (current) => ({
          ...current,
          phase: "error",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        })
      );
    } finally {
      setBulkSyncing(false);
    }
  }

  // ============================================================
  // USE LP
  // ============================================================

  function useLandingPage(
    item: LandingPage
  ) {
    localStorage.setItem(
      "selectedLandingPage",
      JSON.stringify(item)
    );

    window.location.href =
      "/generate";
  }

  return (
    <div className="app">
      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            N
          </div>

          <div>
            <div className="brandName">
              ND Creative
            </div>

            <div className="brandSub">
              Factory
            </div>
          </div>
        </div>

        <div className="navLabel">
          WORKSPACE
        </div>

        <nav className="nav">
          <button
            onClick={() =>
              (window.location.href =
                "/")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            onClick={() =>
              (window.location.href =
                "/")
            }
          >
            <span>▧</span>
            Images
          </button>

          <button
            onClick={() =>
              (window.location.href =
                "/products")
            }
          >
            <span>□</span>
            Products
          </button>

          <button className="active">
            <span>▤</span>
            Landing Pages
          </button>

          <button>
            <span>⌘</span>
            Workflows
          </button>

          <button
            onClick={() =>
              (window.location.href =
                "/generate")
            }
          >
            <span>✦</span>
            Generate
          </button>

          <button>
            <span>◷</span>
            Jobs
          </button>
        </nav>

        <div className="sidebarBottom">
          <button>
            <span>⚙</span>
            Settings
          </button>
        </div>
      </aside>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="main">
        <header className="pageHeader">
          <div>
            <div className="eyebrow">
              CREATIVE CONTEXT
            </div>

            <h1>
              Landing Page Library
            </h1>

            <p>
              Search and filter
              Nordace landing pages
              by product.
            </p>
          </div>

          <div className="headerActions">
            <div className="countBadge">
              {pagination.total}{" "}
              landing{" "}
              {pagination.total === 1
                ? "page"
                : "pages"}
            </div>

            <button
              className="syncButton"
              onClick={
                syncAndAnalyzeLandingPages
              }
              disabled={
                bulkSyncing
              }
            >
              {bulkSyncing
                ? "Syncing & Analyzing..."
                : "↻ Sync Landing Pages"}
            </button>

            <button
              className="primaryButton"
              onClick={() => {
                setImportError("");
                setShowAddModal(
                  true
                );
              }}
            >
              + Add Landing Page
            </button>
          </div>
        </header>

        {syncProgress.phase !== "idle" && (
          <section
            className={
              syncProgress.phase ===
              "error"
                ? "syncPanel syncError"
                : syncProgress.phase ===
                    "complete"
                  ? "syncPanel syncComplete"
                  : "syncPanel"
            }
          >
            <div className="syncPanelTop">
              <div>
                <div className="syncPanelEyebrow">
                  LANDING PAGE SYNC
                </div>

                <h3>
                  {syncProgress.phase ===
                  "complete"
                    ? "Sync complete"
                    : syncProgress.phase ===
                        "error"
                      ? "Sync stopped"
                      : syncProgress.phase ===
                          "analyzing"
                        ? "Auto-analyzing landing pages"
                        : "Sync in progress"}
                </h3>

                <p>
                  {syncProgress.message}
                </p>
              </div>

              {bulkSyncing && (
                <div className="syncSpinner" />
              )}
            </div>

            {syncProgress.total > 0 && (
              <>
                <div className="syncProgressTrack">
                  <div
                    className="syncProgressFill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (syncProgress.processed /
                            syncProgress.total) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>

                <div className="syncProgressMeta">
                  <span>
                    {syncProgress.processed} /{" "}
                    {syncProgress.total} processed
                  </span>

                  <strong>
                    {Math.min(
                      100,
                      Math.round(
                        (syncProgress.processed /
                          syncProgress.total) *
                          100
                      )
                    )}
                    %
                  </strong>
                </div>
              </>
            )}

            <div className="syncStats">
              <div>
                <span>INDEX SYNCED</span>
                <strong>
                  {lastSyncResult?.rowsSynced ??
                    lastSyncResult?.uniqueDetected ??
                    "-"}
                </strong>
              </div>

              <div>
                <span>AUTO ANALYZED</span>
                <strong>
                  {syncProgress.analyzed}
                </strong>
              </div>

              <div>
                <span>ALREADY COMPLETE</span>
                <strong>
                  {syncProgress.skipped}
                </strong>
              </div>

              <div>
                <span>FAILED</span>
                <strong>
                  {syncProgress.failed}
                </strong>
              </div>
            </div>

            {lastSyncResult?.needsLogin && (
              <div className="syncCommand">
                npm run lp:login
              </div>
            )}
          </section>
        )}

        {/* ====================================================
            FILTERS
        ==================================================== */}

        <section className="filterPanel">
          {/* LP SEARCH */}

          <div className="filterBlock">
            <label>
              SEARCH LANDING PAGE
            </label>

            <form
              className="searchBox"
              onSubmit={submitSearch}
            >
              <span>⌕</span>

              <input
                value={
                  searchInput
                }
                onChange={(
                  event
                ) =>
                  setSearchInput(
                    event.target
                      .value
                  )
                }
                placeholder="Search LP name, headline or URL..."
              />

              {searchInput && (
                <button
                  type="button"
                  className="clearSearch"
                  onClick={
                    clearSearch
                  }
                >
                  ×
                </button>
              )}

              <button
                className="searchButton"
                type="submit"
              >
                Search
              </button>
            </form>
          </div>

          {/* PRODUCT FILTER */}

          <div className="filterBlock">
            <label>
              PRODUCT FILTER
            </label>

            <div className="productFilterRow">
              <input
                className="productSearch"
                value={
                  productSearch
                }
                onChange={(
                  event
                ) =>
                  setProductSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search product name or SKU..."
              />

              <select
                value={
                  selectedProductId
                }
                onChange={(
                  event
                ) =>
                  handleProductFilter(
                    event.target
                      .value
                  )
                }
                disabled={
                  productsLoading
                }
              >
                <option value="">
                  {productsLoading
                    ? "Loading products..."
                    : `All Products (${products.length})`}
                </option>

                {filteredProducts.map(
                  (
                    product
                  ) => (
                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {product.name}
                      {product.sku
                        ? ` — ${product.sku}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="filterActions">
            <button
              className="clearFilterButton"
              onClick={
                clearAllFilters
              }
            >
              Clear Filters
            </button>
          </div>
        </section>

        {/* ====================================================
            ACTIVE PRODUCT
        ==================================================== */}

        {selectedProduct && (
          <div className="activeFilterBar">
            <div>
              <span className="activeLabel">
                Showing LPs for
              </span>

              <strong>
                {
                  selectedProduct.name
                }
              </strong>

              {selectedProduct.sku && (
                <span className="activeSku">
                  {
                    selectedProduct.sku
                  }
                </span>
              )}
            </div>

            <button
              onClick={() =>
                handleProductFilter(
                  ""
                )
              }
            >
              × Clear
            </button>
          </div>
        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {/* ====================================================
            CONTENT
        ==================================================== */}

        {loading ? (
          <div className="emptyState">
            Loading landing
            pages...
          </div>
        ) : landingPages.length ===
          0 ? (
          <div className="emptyState">
            <div className="emptyIcon">
              ▤
            </div>

            <h2>
              No landing pages
              found
            </h2>

            {selectedProduct ? (
              <p>
                No landing pages
                are linked to{" "}
                <strong>
                  {
                    selectedProduct.name
                  }
                </strong>
                .
              </p>
            ) : (
              <p>
                Try another search
                or product filter.
              </p>
            )}

            <button
              className="secondaryButton"
              onClick={
                clearAllFilters
              }
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid">
              {landingPages.map(
                (item) => (
                  <article
                    className="card"
                    key={item.id}
                  >
                    <div className="cardTop">
                      <div className="lpIcon">
                        LP
                      </div>

                      <div className="cardTopInfo">
                        <div className="statusRow">
                          <span className="statusBadge">
                            {item.status ||
                              "active"}
                          </span>

                          {item.language && (
                            <span className="metaBadge">
                              {item.language.toUpperCase()}
                            </span>
                          )}

                          {item.market && (
                            <span className="metaBadge">
                              {
                                item.market
                              }
                            </span>
                          )}
                        </div>

                        <h2
                          title={
                            item.title ||
                            ""
                          }
                        >
                          {item.title ||
                            item.slug ||
                            "Untitled Landing Page"}
                        </h2>

                        <div className="slug">
                          {item.slug}
                        </div>
                      </div>
                    </div>

                    <div className="cardContent">
                      <div className="infoBlock">
                        <div className="infoLabel">
                          PRODUCT
                        </div>

                        <div className="productName">
                          {item.product_name ||
                            "Not matched"}
                        </div>
                      </div>

                      <div className="divider" />

                      <div className="infoBlock">
                        <div className="infoLabel">
                          HEADLINE
                        </div>

                        <div className="headline">
                          {item.headline ||
                            "No headline detected"}
                        </div>
                      </div>

                      {item.subheadline && (
                        <div className="subheadline">
                          {
                            item.subheadline
                          }
                        </div>
                      )}

                      {item.offer && (
                        <div className="offer">
                          <span>
                            OFFER
                          </span>

                          {
                            item.offer
                          }
                        </div>
                      )}
                    </div>

                    <div className="cardFooter">
                      <button
                        className="secondaryButton"
                        onClick={() =>
                          window.open(
                            item.url,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                      >
                        Open LP ↗
                      </button>

                      <button
                        className="secondaryButton"
                        disabled={
                          reanalyzingId ===
                          item.id
                        }
                        onClick={() =>
                          reanalyzeLandingPage(
                            item
                          )
                        }
                      >
                        {reanalyzingId ===
                        item.id
                          ? "Analyzing..."
                          : "Re-analyze"}
                      </button>

                      <button
                        className="useButton"
                        onClick={() =>
                          useLandingPage(
                            item
                          )
                        }
                      >
                        Use LP
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>

            {/* PAGINATION */}

            <div className="pagination">
              <button
                disabled={
                  !pagination.hasPreviousPage
                }
                onClick={() =>
                  setPage(
                    (
                      value
                    ) =>
                      Math.max(
                        1,
                        value - 1
                      )
                  )
                }
              >
                ← Previous
              </button>

              <div>
                Page{" "}
                <strong>
                  {
                    pagination.page
                  }
                </strong>{" "}
                of{" "}
                <strong>
                  {
                    pagination.pages
                  }
                </strong>
              </div>

              <button
                disabled={
                  !pagination.hasNextPage
                }
                onClick={() =>
                  setPage(
                    (
                      value
                    ) =>
                      value + 1
                  )
                }
              >
                Next →
              </button>
            </div>
          </>
        )}
      </main>

      {/* ======================================================
          ADD LP MODAL
      ====================================================== */}

      {showAddModal && (
        <div
          className="modalBackdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !importing
            ) {
              setShowAddModal(
                false
              );
            }
          }}
        >
          <div className="modal">
            <div className="modalHeader">
              <div>
                <div className="eyebrow">
                  IMPORT & ANALYZE
                </div>

                <h2>
                  Add Landing Page
                </h2>
              </div>

              <button
                className="modalClose"
                disabled={
                  importing
                }
                onClick={() =>
                  setShowAddModal(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <p className="modalDescription">
              Paste a public
              Nordace landing page
              URL. Creative Factory
              will analyze the page
              and link it to the
              matching product.
            </p>

            <label className="fieldLabel">
              LANDING PAGE URL
            </label>

            <input
              className="urlInput"
              autoFocus
              value={newUrl}
              disabled={
                importing
              }
              onChange={(
                event
              ) =>
                setNewUrl(
                  event.target
                    .value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                    "Enter" &&
                  !importing
                ) {
                  importLandingPage();
                }
              }}
              placeholder="https://lp.nordace.com/page/..."
            />

            <div className="helper">
              Only public URLs from
              lp.nordace.com are
              accepted.
            </div>

            {importError && (
              <div className="modalError">
                {
                  importError
                }
              </div>
            )}

            <div className="modalActions">
              <button
                className="secondaryButton"
                disabled={
                  importing
                }
                onClick={() =>
                  setShowAddModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                className="primaryButton"
                disabled={
                  importing ||
                  !newUrl.trim()
                }
                onClick={
                  importLandingPage
                }
              >
                {importing
                  ? "Analyzing Landing Page..."
                  : "Analyze & Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          CSS
      ====================================================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .app {
          min-height: 100vh;
          background: #f7f8fa;
          color: #111827;
          display: flex;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .sidebar {
          width: 230px;
          min-height: 100vh;
          background: #111827;
          color: white;
          padding: 22px 14px;
          display: flex;
          flex-direction: column;
          position: fixed;
          inset: 0 auto 0 0;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 9px 25px;
        }

        .brandMark {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #2563eb;
          font-weight: 800;
        }

        .brandName {
          font-weight: 750;
          font-size: 15px;
        }

        .brandSub {
          font-size: 12px;
          color: #9ca3af;
        }

        .navLabel {
          color: #6b7280;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.11em;
          padding: 0 11px 9px;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav button,
        .sidebarBottom button {
          width: 100%;
          border: 0;
          background: transparent;
          color: #9ca3af;
          text-align: left;
          padding: 11px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
        }

        .nav button:hover,
        .sidebarBottom button:hover {
          background: #1f2937;
          color: white;
        }

        .nav button.active {
          background: #1d4ed8;
          color: white;
        }

        .sidebarBottom {
          margin-top: auto;
        }

        .main {
          margin-left: 230px;
          width: calc(
            100% - 230px
          );
          padding: 32px 34px
            60px;
        }

        .pageHeader {
          display: flex;
          justify-content:
            space-between;
          gap: 30px;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #2563eb;
          margin-bottom: 6px;
        }

        .pageHeader h1 {
          font-size: 28px;
          margin: 0;
        }

        .pageHeader p {
          color: #64748b;
          font-size: 13px;
          margin: 7px 0 0;
        }

        .headerActions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .countBadge {
          border: 1px solid
            #d5dae2;
          background: white;
          border-radius: 7px;
          padding: 9px 12px;
          font-size: 12px;
          white-space: nowrap;
        }

        .primaryButton {
          border: 1px solid
            #2563eb;
          background: #2563eb;
          color: white;
          padding: 10px 15px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 650;
        }

        .syncButton {
          border: 1px solid #2563eb;
          background: white;
          color: #2563eb;
          padding: 10px 15px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .syncButton:hover:not(:disabled) {
          background: #eff6ff;
        }

        .syncButton:disabled {
          opacity: .6;
          cursor: wait;
        }

        .syncPanel {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 14px;
        }

        .syncPanel.syncComplete {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .syncPanel.syncError {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .syncPanelTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .syncPanelEyebrow {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
          color: #2563eb;
          margin-bottom: 5px;
        }

        .syncPanel h3 {
          margin: 0;
          font-size: 16px;
        }

        .syncPanel p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.55;
        }

        .syncSpinner {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          border-radius: 50%;
          border: 3px solid #bfdbfe;
          border-top-color: #2563eb;
          animation: syncSpin .8s linear infinite;
        }

        @keyframes syncSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .syncProgressTrack {
          height: 9px;
          overflow: hidden;
          background: #dbeafe;
          border-radius: 999px;
          margin-top: 14px;
        }

        .syncProgressFill {
          height: 100%;
          background: #2563eb;
          border-radius: inherit;
          transition: width .25s ease;
        }

        .syncProgressMeta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 6px;
          color: #64748b;
          font-size: 10px;
        }

        .syncProgressMeta strong {
          color: #1d4ed8;
        }

        .syncStats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }

        .syncStats > div {
          padding: 10px 11px;
          border: 1px solid rgba(148, 163, 184, .22);
          border-radius: 7px;
          background: rgba(255, 255, 255, .72);
        }

        .syncStats span,
        .syncStats strong {
          display: block;
        }

        .syncStats span {
          color: #64748b;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .05em;
        }

        .syncStats strong {
          margin-top: 3px;
          color: #0f172a;
          font-size: 16px;
        }

        .syncCommand {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 6px;
          background: #0f172a;
          color: white;
          font-size: 11px;
          font-family: monospace;
        }

        .filterPanel {
          background: white;
          border: 1px solid
            #d7dce4;
          border-radius: 10px;
          padding: 16px;
          display: grid;
          grid-template-columns:
            minmax(
              300px,
              1fr
            )
            minmax(
              440px,
              1.2fr
            )
            auto;
          gap: 16px;
          align-items: end;
          margin-bottom: 14px;
        }

        .filterBlock label {
          display: block;
          font-size: 9px;
          color: #64748b;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 7px;
        }

        .searchBox {
          display: flex;
          align-items: center;
          height: 42px;
          border: 1px solid
            #cbd5e1;
          border-radius: 7px;
          overflow: hidden;
        }

        .searchBox span {
          padding-left: 12px;
          color: #94a3b8;
        }

        .searchBox input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: none;
          padding: 0 10px;
        }

        .clearSearch {
          border: 0;
          background: transparent;
          color: #64748b;
          font-size: 18px;
        }

        .searchButton {
          height: 100%;
          border: 0;
          border-left: 1px solid
            #e5e7eb;
          background: #f8fafc;
          padding: 0 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .productFilterRow {
          display: grid;
          grid-template-columns:
            minmax(
              180px,
              0.7fr
            )
            minmax(
              260px,
              1.3fr
            );
          gap: 8px;
        }

        .productSearch,
        .productFilterRow select {
          width: 100%;
          min-width: 0;
          height: 42px;
          border: 1px solid
            #cbd5e1;
          border-radius: 7px;
          background: white;
          padding: 0 10px;
          outline: none;
        }

        .productSearch:focus,
        .productFilterRow
          select:focus {
          border-color: #2563eb;
        }

        .filterActions {
          display: flex;
        }

        .clearFilterButton {
          height: 42px;
          border: 1px solid
            #cbd5e1;
          background: #f8fafc;
          border-radius: 7px;
          padding: 0 14px;
          cursor: pointer;
          white-space: nowrap;
        }

        .activeFilterBar {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          padding: 11px 14px;
          border: 1px solid
            #bfdbfe;
          background: #eff6ff;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 12px;
        }

        .activeLabel {
          color: #64748b;
          margin-right: 7px;
        }

        .activeSku {
          margin-left: 8px;
          color: #2563eb;
          font-size: 10px;
        }

        .activeFilterBar button {
          border: 0;
          background: transparent;
          color: #2563eb;
          cursor: pointer;
          font-weight: 700;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );
          gap: 16px;
        }

        .card {
          background: white;
          border: 1px solid
            #d7dce4;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cardTop {
          padding: 18px;
          display: flex;
          gap: 13px;
          border-bottom: 1px solid
            #eef0f3;
        }

        .lpIcon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 9px;
          background: #eff6ff;
          border: 1px solid
            #bfdbfe;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          display: grid;
          place-items: center;
        }

        .cardTopInfo {
          min-width: 0;
          flex: 1;
        }

        .statusRow {
          display: flex;
          gap: 5px;
          margin-bottom: 7px;
        }

        .statusBadge,
        .metaBadge {
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 9px;
          font-weight: 700;
        }

        .statusBadge {
          background: #dcfce7;
          color: #166534;
        }

        .metaBadge {
          background: #f1f5f9;
          color: #475569;
        }

        .cardTop h2 {
          font-size: 15px;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow:
            ellipsis;
        }

        .slug {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow:
            ellipsis;
        }

        .cardContent {
          padding: 17px 18px;
          flex: 1;
        }

        .infoLabel {
          color: #94a3b8;
          font-size: 9px;
          letter-spacing: 0.09em;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .productName {
          font-size: 12px;
          font-weight: 700;
        }

        .divider {
          height: 1px;
          background: #eef0f3;
          margin: 14px 0;
        }

        .headline {
          font-size: 14px;
          line-height: 1.45;
          font-weight: 700;
        }

        .subheadline {
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
          margin-top: 8px;
          display:
            -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient:
            vertical;
          overflow: hidden;
        }

        .offer {
          display: inline-flex;
          gap: 7px;
          align-items: center;
          background: #fff7ed;
          border: 1px solid
            #fed7aa;
          color: #9a3412;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          margin-top: 12px;
        }

        .offer span {
          font-size: 8px;
          letter-spacing: 0.08em;
        }

        .cardFooter {
          padding: 12px 18px;
          background: #fafafa;
          border-top: 1px solid
            #eef0f3;
          display: flex;
          gap: 7px;
        }

        .secondaryButton,
        .useButton {
          border-radius: 6px;
          padding: 8px 11px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
        }

        .secondaryButton {
          background: white;
          border: 1px solid
            #cfd5de;
          color: #334155;
        }

        .useButton {
          margin-left: auto;
          background: #2563eb;
          border: 1px solid
            #2563eb;
          color: white;
        }

        .pagination {
          display: flex;
          justify-content:
            center;
          align-items: center;
          gap: 18px;
          margin-top: 28px;
          color: #64748b;
          font-size: 12px;
        }

        .pagination button {
          border: 1px solid
            #d5dae2;
          background: white;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
        }

        .pagination
          button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .emptyState {
          border: 1px dashed
            #cbd5e1;
          background: white;
          border-radius: 10px;
          padding: 70px 20px;
          text-align: center;
          color: #64748b;
        }

        .emptyState h2 {
          color: #1e293b;
          font-size: 18px;
        }

        .errorBox,
        .modalError {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid
            #fecaca;
          border-radius: 7px;
          padding: 11px 13px;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background:
            rgba(
              15,
              23,
              42,
              0.55
            );
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .modal {
          width: min(
            600px,
            100%
          );
          background: white;
          border-radius: 12px;
          padding: 23px;
        }

        .modalHeader {
          display: flex;
          justify-content:
            space-between;
        }

        .modalHeader h2 {
          margin: 0;
        }

        .modalClose {
          border: 0;
          background: transparent;
          font-size: 25px;
          cursor: pointer;
        }

        .modalDescription {
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .fieldLabel {
          display: block;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .urlInput {
          width: 100%;
          border: 1px solid
            #cbd5e1;
          border-radius: 7px;
          padding: 11px 12px;
        }

        .helper {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 6px;
        }

        .modalActions {
          display: flex;
          justify-content:
            flex-end;
          gap: 8px;
          margin-top: 22px;
        }

        @media (
          max-width: 1150px
        ) {
          .filterPanel {
            grid-template-columns:
              1fr;
          }

          .productFilterRow {
            grid-template-columns:
              1fr 1fr;
          }
        }

        @media (
          max-width: 900px
        ) {
          .syncStats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .grid {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 760px
        ) {
          .sidebar {
            display: none;
          }

          .main {
            margin-left: 0;
            width: 100%;
            padding: 22px 16px
              50px;
          }

          .pageHeader {
            flex-direction:
              column;
          }

          .productFilterRow {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>
    </div>
  );
}