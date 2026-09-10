"use client";

import { useEffect, useState } from "react";

type ProductKind = "single" | "bundle" | "all";

type ProductImage = {
  source_id?: number | null;
  src: string;
  alt?: string | null;
  position?: number | null;
};

type Product = {
  id: number;
  name: string;

  slug?: string | null;
  sku?: string | null;

  status?: string | null;
  language?: string | null;

  description?: string | null;
  short_description?: string | null;

  permalink?: string | null;

  price?: string | null;
  regular_price?: string | null;
  sale_price?: string | null;

  featured_image?: string | null;

  product_kind?: "single" | "bundle" | "other";

  metadata?: {
    type?: string | null;
    stock_status?: string | null;
    variation_ids?: number[];
    attributes?: unknown;
  } | null;

  product_images?: ProductImage[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type Counts = {
  single: number;
  bundle: number;
  all: number;
};

export default function ProductsPage() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [kind, setKind] =
    useState<ProductKind>("single");

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [counts, setCounts] =
    useState<Counts>({
      single: 0,
      bundle: 0,
      all: 0,
    });

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 24,
      total: 0,
      pages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  // ============================================================
  // LOAD PRODUCTS
  // ============================================================

  useEffect(() => {
    const controller =
      new AbortController();

    const timer = setTimeout(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(page)
          );

          params.set(
            "limit",
            "24"
          );

          params.set(
            "kind",
            kind
          );

          if (search.trim()) {
            params.set(
              "search",
              search.trim()
            );
          }

          const response =
            await fetch(
              `/api/library/products?${params.toString()}`,
              {
                cache: "no-store",
                signal:
                  controller.signal,
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
                "Failed to load products"
            );
          }

          setProducts(
            result.data ?? []
          );

          setPagination(
            result.pagination
          );

          setCounts(
            result.counts ?? {
              single: 0,
              bundle: 0,
              all: 0,
            }
          );
        } catch (error: any) {
          if (
            error?.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "Load products error:",
            error
          );

          setProducts([]);

          setError(
            error instanceof Error
              ? error.message
              : "Failed to load products"
          );
        } finally {
          setLoading(false);
        }
      },
      250
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, kind]);

  // ============================================================
  // RESET PAGE
  // ============================================================

  useEffect(() => {
    setPage(1);
  }, [search, kind]);

  // ============================================================
  // PRODUCT ACTIONS
  // ============================================================

  const openProduct = (
    product: Product
  ) => {
    setSelectedProduct(product);

    const firstImage =
      product.product_images?.[0]
        ?.src ||
      product.featured_image ||
      null;

    setSelectedImage(
      firstImage
    );
  };

  const useProduct = (
    product: Product
  ) => {
    localStorage.setItem(
      "selectedProduct",
      JSON.stringify(product)
    );

    alert(
      `Product selected: ${product.name}`
    );
  };

  const currentTitle =
    kind === "single"
      ? "Single Products"
      : kind === "bundle"
        ? "Bundles"
        : "All Products";

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="app-shell">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">
            ND Creative Factory
          </div>

          <div className="brand-subtitle">
            Powered by Nordace
          </div>
        </div>

        <nav className="nav">
          <button
            className="nav-item"
            onClick={() => {
              window.location.href =
                "/";
            }}
          >
            Dashboard
          </button>

          <button
            className="nav-item"
            onClick={() => {
              window.location.href =
                "/";
            }}
          >
            Images
          </button>

          <button className="nav-item active">
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

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="main">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="search-wrapper">
            <span className="search-icon">
              ⌕
            </span>

            <input
              className="top-search"
              value={search}
              placeholder="Search product name or SKU..."
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {search && (
              <button
                className="clear-search"
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <div className="profile">
            <div className="profile-text">
              <strong>
                Creative Factory
              </strong>

              <span>
                Nordace
              </span>
            </div>

            <div className="avatar">
              CF
            </div>
          </div>
        </header>

        {/* ====================================================
            CONTENT
        ==================================================== */}

        <section className="content">

          <div className="heading-row">

            <div>
              <h1>
                Product Library
              </h1>

              <p>
                Select Nordace product
                references for creative
                generation.
              </p>
            </div>

            <div className="product-count">
              {loading
                ? "Loading..."
                : `${pagination.total} ${
                    kind === "bundle"
                      ? "bundles"
                      : "products"
                  }`}
            </div>
          </div>

          {/* ==================================================
              PRODUCT TYPE TABS
          ================================================== */}

          <div className="tabs">

            <button
              className={
                kind === "single"
                  ? "tab active"
                  : "tab"
              }
              onClick={() =>
                setKind("single")
              }
            >
              <span>
                Single Products
              </span>

              <span className="tab-count">
                {counts.single}
              </span>
            </button>

            <button
              className={
                kind === "bundle"
                  ? "tab active"
                  : "tab"
              }
              onClick={() =>
                setKind("bundle")
              }
            >
              <span>
                Bundles
              </span>

              <span className="tab-count">
                {counts.bundle}
              </span>
            </button>

            <button
              className={
                kind === "all"
                  ? "tab active"
                  : "tab"
              }
              onClick={() =>
                setKind("all")
              }
            >
              <span>
                All Products
              </span>

              <span className="tab-count">
                {counts.all}
              </span>
            </button>

          </div>

          {/* ==================================================
              CONTEXT
          ================================================== */}

          <div className="context-row">

            <div>
              <strong>
                {currentTitle}
              </strong>

              {search && (
                <span>
                  {" "}
                  matching “{search}”
                </span>
              )}
            </div>

            <div>
              Page{" "}
              {pagination.page} of{" "}
              {pagination.pages}
            </div>

          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="error-state">
              {error}
            </div>
          )}

          {/* ==================================================
              PRODUCTS
          ================================================== */}

          {!error &&
          loading &&
          products.length === 0 ? (
            <div className="empty">
              Loading {currentTitle.toLowerCase()}...
            </div>
          ) : !error &&
            products.length === 0 ? (
            <div className="empty">

              <strong>
                No products found
              </strong>

              <span>
                Try another product
                name or SKU.
              </span>

            </div>
          ) : !error ? (

            <div className="grid">

              {products.map(
                (product) => {

                  const preview =
                    product
                      .product_images?.[0]
                      ?.src ||
                    product.featured_image ||
                    "";

                  const imageCount =
                    product
                      .product_images
                      ?.length ?? 0;

                  return (
                    <article
                      key={
                        product.id
                      }
                      className="card"
                    >

                      {/* IMAGE */}

                      <button
                        className="image-button"
                        onClick={() =>
                          openProduct(
                            product
                          )
                        }
                      >

                        {preview ? (
                          <img
                            src={
                              preview
                            }
                            alt={
                              product.name
                            }
                            loading="lazy"
                          />
                        ) : (
                          <div className="no-image">
                            No image
                          </div>
                        )}

                        <div className="product-type-badge">
                          {product.product_kind ===
                          "bundle"
                            ? "BUNDLE"
                            : product.product_kind ===
                                "single"
                              ? "SINGLE"
                              : "OTHER"}
                        </div>

                        <div className="image-count">
                          {imageCount}{" "}
                          {imageCount === 1
                            ? "image"
                            : "images"}
                        </div>

                      </button>

                      {/* BODY */}

                      <div className="card-body">

                        <div className="product-name">
                          {
                            product.name
                          }
                        </div>

                        <div className="meta">

                          <span className="sku">
                            {product.sku ||
                              "No SKU"}
                          </span>

                          <span>
                            {product
                              .metadata
                              ?.stock_status ||
                              product.status ||
                              "Product"}
                          </span>

                        </div>

                        <div className="price">
                          {product.sale_price
                            ? `$${product.sale_price}`
                            : product.price
                              ? `$${product.price}`
                              : "Price unavailable"}
                        </div>

                        <div className="actions">

                          <button
                            className="secondary"
                            onClick={() =>
                              openProduct(
                                product
                              )
                            }
                          >
                            View Product
                          </button>

                          <button
                            className="primary"
                            onClick={() =>
                              useProduct(
                                product
                              )
                            }
                          >
                            Use Product
                          </button>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          ) : null}

          {/* ==================================================
              PAGINATION
          ================================================== */}

          {pagination.pages > 1 &&
            !error && (

            <div className="pagination">

              <button
                disabled={
                  !pagination.hasPreviousPage ||
                  loading
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        current - 1,
                        1
                      )
                  )
                }
              >
                ← Previous
              </button>

              <div>
                Page{" "}
                <strong>
                  {pagination.page}
                </strong>{" "}
                of{" "}
                <strong>
                  {pagination.pages}
                </strong>
              </div>

              <button
                disabled={
                  !pagination.hasNextPage ||
                  loading
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      current + 1
                  )
                }
              >
                Next →
              </button>

            </div>
          )}

        </section>
      </main>

      {/* ======================================================
          PRODUCT MODAL
      ====================================================== */}

      {selectedProduct && (

        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedProduct(
              null
            )
          }
        >

          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <div className="modal-eyebrow">
                  {selectedProduct.product_kind ===
                  "bundle"
                    ? "BUNDLE REFERENCE"
                    : "PRODUCT REFERENCE"}
                </div>

                <h2>
                  {
                    selectedProduct.name
                  }
                </h2>

                <p>
                  SKU:{" "}
                  {selectedProduct.sku ||
                    "N/A"}
                </p>

              </div>

              <button
                className="close"
                onClick={() =>
                  setSelectedProduct(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="modal-layout">

              {/* GALLERY */}

              <div className="gallery">

                <div className="main-image">

                  {selectedImage ? (
                    <img
                      src={
                        selectedImage
                      }
                      alt={
                        selectedProduct.name
                      }
                    />
                  ) : (
                    <div className="no-image">
                      No image
                    </div>
                  )}

                </div>

                <div className="thumbs">

                  {selectedProduct.product_images?.map(
                    (
                      image,
                      index
                    ) => (

                      <button
                        key={`${image.src}-${index}`}
                        className={
                          selectedImage ===
                          image.src
                            ? "thumb active"
                            : "thumb"
                        }
                        onClick={() =>
                          setSelectedImage(
                            image.src
                          )
                        }
                      >

                        <img
                          src={
                            image.src
                          }
                          alt={
                            image.alt ||
                            selectedProduct.name
                          }
                        />

                      </button>

                    )
                  )}

                </div>

              </div>

              {/* PRODUCT INFO */}

              <div className="product-info">

                <div className="info-block">
                  <label>
                    Type
                  </label>

                  <strong>
                    {selectedProduct.product_kind ===
                    "bundle"
                      ? "Bundle"
                      : selectedProduct.product_kind ===
                          "single"
                        ? "Single Product"
                        : "Other"}
                  </strong>
                </div>

                <div className="info-block">
                  <label>
                    Product
                  </label>

                  <strong>
                    {
                      selectedProduct.name
                    }
                  </strong>
                </div>

                <div className="info-block">
                  <label>
                    SKU
                  </label>

                  <strong>
                    {selectedProduct.sku ||
                      "N/A"}
                  </strong>
                </div>

                <div className="info-block">
                  <label>
                    Price
                  </label>

                  <strong>
                    {selectedProduct.sale_price
                      ? `$${selectedProduct.sale_price}`
                      : selectedProduct.price
                        ? `$${selectedProduct.price}`
                        : "N/A"}
                  </strong>
                </div>

                <div className="info-block">
                  <label>
                    Reference Images
                  </label>

                  <strong>
                    {selectedProduct
                      .product_images
                      ?.length ?? 0}
                  </strong>
                </div>

                <div className="info-block">
                  <label>
                    Variations
                  </label>

                  <strong>
                    {selectedProduct
                      .metadata
                      ?.variation_ids
                      ?.length ?? 0}
                  </strong>
                </div>

                {selectedProduct.short_description && (
                  <div className="description">
                    {
                      selectedProduct.short_description
                    }
                  </div>
                )}

                <button
                  className="use-large"
                  onClick={() =>
                    useProduct(
                      selectedProduct
                    )
                  }
                >
                  Use Product
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* ======================================================
          CSS
      ====================================================== */}

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
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app-shell {
          min-height: 100vh;
          display: flex;
        }

        /* SIDEBAR */

        .sidebar {
          width: 240px;
          min-height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          background: white;
          border-right: 1px solid #d9dde5;
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
          color: #334155;
        }

        .nav-item:hover {
          background: #f3f6fb;
        }

        .nav-item.active {
          background: #eaf2ff;
          color: #165dff;
        }

        /* MAIN */

        .main {
          margin-left: 240px;
          width: calc(100% - 240px);
          min-height: 100vh;
        }

        /* TOP BAR */

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

        .search-wrapper {
          width: min(560px, 55vw);
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 20px;
          pointer-events: none;
        }

        .top-search {
          width: 100%;
          height: 44px;
          border: 1px solid #9aa4b2;
          border-radius: 8px;
          padding: 0 42px 0 42px;
          outline: none;
          background: white;
        }

        .top-search:focus {
          border-color: #165dff;
          box-shadow: 0 0 0 3px rgba(22, 93, 255, 0.08);
        }

        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border: 0;
          background: transparent;
          color: #64748b;
          font-size: 20px;
          border-radius: 5px;
        }

        .clear-search:hover {
          background: #f1f5f9;
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

        /* CONTENT */

        .content {
          padding: 34px 32px 60px;
          max-width: 1500px;
          margin: auto;
        }

        .heading-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .heading-row h1 {
          margin: 0;
          font-size: 34px;
        }

        .heading-row p {
          margin: 8px 0 0;
          color: #64748b;
        }

        .product-count {
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13px;
          white-space: nowrap;
        }

        /* TABS */

        .tabs {
          margin-top: 28px;
          display: flex;
          gap: 8px;
          padding-bottom: 1px;
          border-bottom: 1px solid #dbe2ea;
        }

        .tab {
          min-height: 44px;
          border: 0;
          background: transparent;
          color: #64748b;
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid transparent;
          font-weight: 600;
          margin-bottom: -1px;
        }

        .tab:hover {
          color: #111827;
        }

        .tab.active {
          color: #165dff;
          border-bottom-color: #165dff;
        }

        .tab-count {
          min-width: 23px;
          height: 23px;
          padding: 0 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #eef2f7;
          color: #475569;
          border-radius: 999px;
          font-size: 11px;
        }

        .tab.active .tab-count {
          background: #eaf2ff;
          color: #165dff;
        }

        /* CONTEXT */

        .context-row {
          margin: 20px 0 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #64748b;
          font-size: 13px;
        }

        .context-row strong {
          color: #111827;
        }

        /* GRID */

        .grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(260px, 1fr)
            );
          gap: 22px;
        }

        .card {
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          overflow: hidden;
          min-width: 0;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            border-color 0.15s ease;
        }

        .card:hover {
          transform: translateY(-2px);
          border-color: #aab5c4;
          box-shadow:
            0 8px 24px
            rgba(15, 23, 42, 0.07);
        }

        .image-button {
          position: relative;
          width: 100%;
          padding: 0;
          border: 0;
          background: #f1f5f9;
          aspect-ratio: 1 / 1;
          overflow: hidden;
        }

        .image-button img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .product-type-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 6px 8px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.7);
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.04em;
        }

        .image-count {
          position: absolute;
          right: 10px;
          bottom: 10px;
          background: rgba(17, 24, 39, 0.84);
          color: white;
          padding: 6px 9px;
          border-radius: 6px;
          font-size: 11px;
        }

        .card-body {
          padding: 15px;
        }

        .product-name {
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .meta {
          margin-top: 9px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #64748b;
          font-size: 11px;
        }

        .sku {
          color: #165dff;
          font-weight: 600;
        }

        .price {
          margin-top: 12px;
          font-weight: 700;
          font-size: 14px;
        }

        .actions {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .actions button {
          height: 38px;
          border-radius: 6px;
        }

        .secondary {
          background: white;
          color: #111827;
          border: 1px solid #94a3b8;
        }

        .secondary:hover {
          background: #f8fafc;
        }

        .primary {
          background: #165dff;
          border: 1px solid #165dff;
          color: white;
        }

        .primary:hover {
          background: #0f4fe0;
        }

        /* EMPTY */

        .empty,
        .error-state {
          min-height: 360px;
          border-radius: 12px;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .empty {
          border: 1px dashed #cbd5e1;
          color: #64748b;
        }

        .empty strong {
          color: #111827;
        }

        .error-state {
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        /* PAGINATION */

        .pagination {
          margin-top: 30px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
        }

        .pagination button {
          min-width: 120px;
          height: 40px;
          border-radius: 7px;
          border: 1px solid #94a3b8;
          background: white;
        }

        .pagination button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* MODAL */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background:
            rgba(15, 23, 42, 0.68);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
        }

        .modal {
          width: min(1100px, 100%);
          max-height: 92vh;
          overflow: auto;
          background: white;
          border-radius: 16px;
          box-shadow:
            0 30px 80px
            rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          padding: 24px 26px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .modal-header h2 {
          margin: 5px 0;
        }

        .modal-header p {
          margin: 0;
          color: #64748b;
        }

        .modal-eyebrow {
          color: #165dff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .close {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 8px;
          font-size: 28px;
          background: #f1f5f9;
        }

        .modal-layout {
          padding: 26px;
          display: grid;
          grid-template-columns:
            minmax(0, 1.5fr)
            minmax(280px, 0.65fr);
          gap: 30px;
        }

        .main-image {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          display: grid;
          place-items: center;
        }

        .main-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .thumbs {
          margin-top: 14px;
          display: grid;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(76px, 1fr)
            );
          gap: 8px;
        }

        .thumb {
          border: 2px solid transparent;
          background: #f8fafc;
          border-radius: 8px;
          overflow: hidden;
          padding: 0;
          aspect-ratio: 1 / 1;
        }

        .thumb.active {
          border-color: #165dff;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .product-info {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .info-block {
          padding: 13px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .info-block label {
          color: #64748b;
          font-size: 11px;
        }

        .description {
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
          font-size: 13px;
          line-height: 1.55;
          color: #475569;
          max-height: 150px;
          overflow: auto;
        }

        .use-large {
          margin-top: auto;
          min-height: 46px;
          background: #165dff;
          border: 0;
          color: white;
          border-radius: 8px;
          font-weight: 700;
        }

        .no-image {
          color: #94a3b8;
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
        }

        /* MOBILE */

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

          .search-wrapper {
            width: min(100%, 520px);
          }

          .profile {
            display: none;
          }

          .content {
            padding: 24px 18px 50px;
          }

          .heading-row {
            align-items: flex-start;
          }

          .tabs {
            overflow-x: auto;
          }

          .tab {
            flex: 0 0 auto;
          }

          .modal-layout {
            grid-template-columns: 1fr;
          }

          .modal-overlay {
            padding: 12px;
          }

        }

      `}</style>

    </div>
  );
}