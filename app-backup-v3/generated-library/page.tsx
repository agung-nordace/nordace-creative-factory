"use client";

import { useEffect, useMemo, useState } from "react";

type Asset = {
  id: number;
  generation_job_id: number;
  generation_run_id: number;
  title: string | null;
  creative_model_id: string | null;
  creative_model_name: string | null;
  archetype_name: string | null;
  concept_name: string | null;
  ratio: string | null;
  product_summary: string | null;
  product_keys?: string[] | null;
  product_names?: string[] | null;
  product_skus?: string[] | null;
  image_url: string;
  created_at: string;
};

type ProductOption = {
  key: string;
  name: string;
  sku: string;
  count: number;
};

export default function GeneratedLibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  async function loadAssets(productKey = selectedProductKey, searchValue = search) {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("limit", "100");

      if (searchValue.trim()) params.set("search", searchValue.trim());
      if (productKey) params.set("product_key", productKey);

      const response = await fetch(
        `/api/library/generated-creatives?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not load creative library.");
      }

      setAssets(result.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadProductIndex() {
    try {
      const response = await fetch(
        "/api/library/generated-creatives?limit=100",
        { cache: "no-store" }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setAllAssets(result.data || []);
      }
    } catch (error) {
      console.error("Could not load library product index:", error);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setSelectedAssetId(params.get("asset_id"));

    const productKey = params.get("product_key") || "";
    setSelectedProductKey(productKey);

    loadProductIndex();
    loadAssets(productKey, "");
  }, []);

  const productOptions = useMemo<ProductOption[]>(() => {
    const map = new Map<string, ProductOption>();

    for (const asset of allAssets) {
      const keys = Array.isArray(asset.product_keys) ? asset.product_keys : [];
      const names = Array.isArray(asset.product_names) ? asset.product_names : [];
      const skus = Array.isArray(asset.product_skus) ? asset.product_skus : [];

      if (!keys.length && asset.product_summary) {
        const fallbackKey = asset.product_summary.toLowerCase().replace(/\s+/g, "-");
        const existing = map.get(fallbackKey);

        map.set(fallbackKey, {
          key: fallbackKey,
          name: asset.product_summary,
          sku: "",
          count: (existing?.count || 0) + 1,
        });

        continue;
      }

      keys.forEach((key, index) => {
        const name = names[index] || names[0] || skus[index] || skus[0] || key;
        const sku = skus[index] || skus[0] || "";
        const existing = map.get(key);

        map.set(key, {
          key,
          name,
          sku,
          count: (existing?.count || 0) + 1,
        });
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allAssets]);

  const sortedAssets = useMemo(() => {
    if (!selectedAssetId) return assets;

    return [...assets].sort((a, b) => {
      if (String(a.id) === selectedAssetId) return -1;
      if (String(b.id) === selectedAssetId) return 1;
      return 0;
    });
  }, [assets, selectedAssetId]);

  const activeProduct =
    productOptions.find((item) => item.key === selectedProductKey) || null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">N</div>
          <div>
            <div className="brandName">ND Creative</div>
            <div className="brandSub">Factory</div>
          </div>
        </div>

        <div className="navLabel">WORKSPACE</div>

        <nav className="nav">
          <button onClick={() => (window.location.href = "/")}>⌂ <span>Dashboard</span></button>
          <button>▧ <span>Images</span></button>
          <button onClick={() => (window.location.href = "/products")}>□ <span>Products</span></button>
          <button onClick={() => (window.location.href = "/landing-pages")}>▤ <span>Landing Pages</span></button>
          <button>⌘ <span>Workflows</span></button>
          <button onClick={() => (window.location.href = "/generate?restore=1")}>✦ <span>Generate</span></button>
          <button className="active">▣ <span>Library</span></button>
          <button>◷ <span>Jobs</span></button>
        </nav>

        <div className="sidebarBottom">
          <button>⚙ <span>Settings</span></button>
        </div>
      </aside>

      <main className="main">
        <header className="pageHeader">
          <div>
            <div className="eyebrow">CREATIVE LIBRARY</div>
            <h1>Generated Creatives</h1>
            <p>Creative Factory outputs organized by product.</p>
          </div>

          <a className="generateButton" href="/generate?restore=1">
            ✦ Back to Generate
          </a>
        </header>

        <section className="filterCard">
          <div className="filterField">
            <label>SEARCH CREATIVES</label>
            <div className="searchControl">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search concept, archetype, creative model..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadAssets();
                }}
              />
              <button onClick={() => loadAssets()}>Search</button>
            </div>
          </div>

          <div className="filterField">
            <label>PRODUCT</label>
            <select
              value={selectedProductKey}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedProductKey(value);
                loadAssets(value, search);
              }}
            >
              <option value="">All Products</option>
              {productOptions.map((product) => (
                <option value={product.key} key={product.key}>
                  {product.name}
                  {product.sku ? ` — ${product.sku}` : ""}
                  {` (${product.count})`}
                </option>
              ))}
            </select>
          </div>

          <button
            className="clearButton"
            onClick={() => {
              setSearch("");
              setSelectedProductKey("");
              loadAssets("", "");
            }}
          >
            Clear Filters
          </button>
        </section>

        <section className="productStrip">
          <button
            className={!selectedProductKey ? "productPill active" : "productPill"}
            onClick={() => {
              setSelectedProductKey("");
              loadAssets("", search);
            }}
          >
            All Products <span>{allAssets.length}</span>
          </button>

          {productOptions.slice(0, 12).map((product) => (
            <button
              key={product.key}
              className={
                selectedProductKey === product.key
                  ? "productPill active"
                  : "productPill"
              }
              onClick={() => {
                setSelectedProductKey(product.key);
                loadAssets(product.key, search);
              }}
            >
              <span className="pillName">{product.name}</span>
              <span>{product.count}</span>
            </button>
          ))}
        </section>

        <div className="libraryHeading">
          <div>
            <h2>{activeProduct ? activeProduct.name : "All Generated Creatives"}</h2>
            <p>
              {activeProduct
                ? `${sortedAssets.length} creative${sortedAssets.length === 1 ? "" : "s"} generated for this product`
                : `${sortedAssets.length} saved creative${sortedAssets.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {activeProduct?.sku && <span className="skuBadge">{activeProduct.sku}</span>}
        </div>

        {loading ? (
          <div className="emptyState">Loading creative library...</div>
        ) : sortedAssets.length === 0 ? (
          <div className="emptyState">
            <strong>No creatives found.</strong>
            <span>Generate a creative for this product or clear the filters.</span>
          </div>
        ) : (
          <div className="assetGrid">
            {sortedAssets.map((asset) => {
              const previewUrl =
                `/api/generate/image?url=${encodeURIComponent(asset.image_url)}`;
              const downloadUrl =
                `/api/generate/image?download=1&url=${encodeURIComponent(asset.image_url)}`;

              return (
                <article
                  className={
                    String(asset.id) === selectedAssetId
                      ? "assetCard highlighted"
                      : "assetCard"
                  }
                  key={asset.id}
                >
                  <a className="assetImage" href={previewUrl} target="_blank" rel="noreferrer">
                    <img src={previewUrl} alt={asset.title || "Generated creative"} />
                  </a>

                  <div className="assetBody">
                    <strong className="assetTitle">
                      {asset.title || asset.creative_model_name || "Generated creative"}
                    </strong>

                    <div className="assetProduct">
                      {(asset.product_names?.length
                        ? asset.product_names
                        : asset.product_summary
                          ? [asset.product_summary]
                          : ["Uncategorized"]
                      ).join(" + ")}
                    </div>

                    <div className="assetMeta">
                      <span>{asset.creative_model_name || "Creative"}</span>
                      <span>{asset.archetype_name || "—"}</span>
                      <span>{asset.ratio || "—"}</span>
                      <span>Run #{asset.generation_run_id}</span>
                    </div>

                    <div className="assetActions">
                      <a href={`/edit-creative?asset_id=${asset.id}`}>✎ Edit</a>
                      <a href={`/repurpose?asset_id=${asset.id}`}>✣ Repurpose</a>
                      <a href={previewUrl} target="_blank" rel="noreferrer">Open</a>
                      <a href={downloadUrl}>↓ Download</a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        * { box-sizing:border-box; }
        .app { min-height:100vh; background:#f8fafc; color:#0f172a; font-family:Arial,Helvetica,sans-serif; }
        .sidebar { position:fixed; left:0; top:0; bottom:0; width:232px; background:#101827; color:white; padding:21px 15px; display:flex; flex-direction:column; z-index:30; }
        .brand { display:flex; align-items:center; gap:11px; padding:0 9px 21px; }
        .brandMark { width:36px; height:36px; border-radius:9px; display:grid; place-items:center; background:#2563eb; font-weight: 700; }
        .brandName { font-size:15px; font-weight: 700; }
        .brandSub { margin-top:2px; color:#cbd5e1; font-size:11px; }
        .navLabel { padding:0 10px 9px; color:#8fa4c3; font-size:10px; font-weight: 700; letter-spacing:.08em; }
        .nav { display:grid; gap:4px; }
        .nav button,.sidebarBottom button { width:100%; border:0; background:transparent; color:#e2e8f0; padding:12px 11px; border-radius:8px; text-align:left; font-size:13px; cursor:pointer; display:flex; gap:10px; align-items:center; }
        .nav button:hover,.sidebarBottom button:hover { background:#172236; }
        .nav button.active { background:#2557df; color:white; }
        .sidebarBottom { margin-top:auto; }
        .main { margin-left:232px; min-height:100vh; padding:32px 34px 50px; }
        .pageHeader { max-width:1500px; margin:0 auto 19px; display:flex; justify-content:space-between; align-items:flex-start; gap:20px; }
        .eyebrow { color:#2563eb; font-size:10px; font-weight: 700; letter-spacing:.1em; }
        h1 { margin:6px 0 5px; font-size:30px; }
        .pageHeader p,.libraryHeading p { margin:0; color:#64748b; font-size:13px; }
        .generateButton { text-decoration:none; border-radius:8px; padding:10px 13px; background:#2563eb; color:white; font-size:12px; font-weight: 700; }
        .filterCard { max-width:1500px; margin:0 auto 12px; padding:13px; display:grid; grid-template-columns:minmax(300px,1.15fr) minmax(260px,.85fr) auto; align-items:end; gap:10px; border:1px solid #dbe3ee; background:white; border-radius:10px; }
        .filterField label { display:block; margin-bottom:6px; color:#64748b; font-size:9px; font-weight: 700; letter-spacing:.07em; }
        .searchControl { display:grid; grid-template-columns:1fr auto; }
        .searchControl input,.filterField select { width:100%; height:40px; border:1px solid #cbd5e1; background:white; padding:0 11px; font-size:12px; outline:none; }
        .searchControl input { border-radius:7px 0 0 7px; }
        .searchControl button { min-width:77px; border:1px solid #cbd5e1; border-left:0; background:#f8fafc; border-radius:0 7px 7px 0; font-weight: 700; cursor:pointer; }
        .filterField select { border-radius:7px; }
        .clearButton { height:40px; border:1px solid #cbd5e1; background:white; color:#475569; border-radius:7px; padding:0 12px; font-size:11px; font-weight: 700; cursor:pointer; }
        .productStrip { max-width:1500px; margin:0 auto 18px; display:flex; gap:7px; overflow-x:auto; padding-bottom:4px; }
        .productPill { flex:0 0 auto; max-width:230px; display:flex; align-items:center; gap:8px; min-height:34px; border:1px solid #dbe3ee; background:white; color:#475569; border-radius:999px; padding:0 10px; cursor:pointer; font-size:10px; font-weight:750; }
        .productPill.active { border-color:#93c5fd; background:#eff6ff; color:#1d4ed8; }
        .productPill > span:last-child { min-width:20px; height:20px; display:grid; place-items:center; border-radius:999px; background:#f1f5f9; font-size:9px; }
        .pillName { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .libraryHeading { max-width:1500px; margin:0 auto 13px; display:flex; align-items:flex-end; justify-content:space-between; gap:15px; }
        .libraryHeading h2 { margin:0 0 4px; font-size:20px; }
        .skuBadge { padding:6px 9px; border-radius:999px; background:#f1f5f9; color:#475569; font-size:10px; font-weight: 700; }
        .assetGrid { max-width:1500px; margin:0 auto; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
        .assetCard { overflow:hidden; background:white; border:1px solid #dbe3ee; border-radius:9px; }
        .assetCard.highlighted { outline:3px solid #93c5fd; outline-offset:2px; }
        .assetImage { display:block; background:#eef2f7; }
        .assetImage img { width:100%; aspect-ratio:1/1; object-fit:contain; display:block; }
        .assetBody { padding:11px; }
        .assetTitle { display:block; font-size:12px; line-height:1.35; }
        .assetProduct { margin-top:5px; color:#1d4ed8; font-size:10px; font-weight: 700; }
        .assetMeta { display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; }
        .assetMeta span { background:#f1f5f9; color:#64748b; border-radius:999px; padding:4px 6px; font-size:9px; font-weight:700; }
        .assetActions { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px; }
        .assetActions a { display:flex; align-items:center; justify-content:center; min-height:32px; text-decoration:none; border:1px solid #cbd5e1; border-radius:6px; color:#334155; background:white; font-size:10px; font-weight: 700; }
        .assetActions a:hover { border-color:#93c5fd; background:#eff6ff; color:#1d4ed8; }
        .emptyState { max-width:1500px; margin:0 auto; min-height:220px; display:flex; flex-direction:column; gap:6px; align-items:center; justify-content:center; border:1px solid #dbe3ee; border-radius:10px; background:white; color:#64748b; font-size:12px; }
        .emptyState strong { color:#0f172a; font-size:14px; }
        @media (max-width:1200px) { .assetGrid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
        @media (max-width:900px) { .sidebar { width:190px; } .main { margin-left:190px; padding:24px 20px 40px; } .filterCard { grid-template-columns:1fr; } .assetGrid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width:650px) { .sidebar { display:none; } .main { margin-left:0; padding:18px; } .pageHeader { flex-direction:column; } .assetGrid { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
