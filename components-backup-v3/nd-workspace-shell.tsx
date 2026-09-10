"use client";

import NdAppSidebar from "@/components/nd-app-sidebar";

export default function NdWorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ndShell">
      <NdAppSidebar />

      <div className="ndShellContent">
        {children}
      </div>

      <style jsx global>{`
        :root {
          --nd-sidebar-width: 248px;
          --nd-content-max: 1540px;
          --nd-page-padding: 32px;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: var(--nd-page) !important;
          color: var(--nd-text) !important;
        }

        .ndShell {
          min-height: 100vh;
          width: 100%;
          background: var(--nd-page);
        }

        .ndShellContent {
          min-width: 0;
          min-height: 100vh;
          width: calc(100% - var(--nd-sidebar-width));
          margin-left: var(--nd-sidebar-width);
          background: var(--nd-page);
          color: var(--nd-text);
        }

        .ndShellContent > * {
          width: 100%;
          max-width: none;
        }

        /* One shared application shell. Old page-level sidebars are suppressed. */
        .ndShellContent > .app > .sidebar,
        .ndShellContent .app > .sidebar,
        .ndShellContent > .sidebar,
        .ndShellContent .app-shell > .sidebar {
          display: none !important;
        }

        .ndShellContent > .app,
        .ndShellContent > .app-shell {
          min-height: 100vh;
          width: 100%;
          background: var(--nd-page) !important;
        }

        .ndShellContent > .app > .main,
        .ndShellContent .app > .main,
        .ndShellContent > .app-shell > .main,
        .ndShellContent .app-shell > .main {
          width: 100% !important;
          max-width: none !important;
          margin-left: 0 !important;
        }

        /* =========================================================
           GLOBAL WORKSPACE LAYOUT
           All product surfaces share the same readable canvas.
        ========================================================== */

        .ndShellContent > main,
        .ndShellContent > .app > main,
        .ndShellContent > .app-shell > main,
        .ndShellContent > .app > .main,
        .ndShellContent > .app-shell > .main {
          min-height: 100vh !important;
          padding: var(--nd-page-padding) !important;
          background: var(--nd-page) !important;
          color: var(--nd-text) !important;
        }

        .ndShellContent > main > *,
        .ndShellContent > .app > main > *,
        .ndShellContent > .app-shell > main > *,
        .ndShellContent > .app > .main > *,
        .ndShellContent > .app-shell > .main > * {
          max-width: var(--nd-content-max);
          margin-left: auto;
          margin-right: auto;
        }

        /* Products had a legacy topbar that made the route feel like another app. */
        .ndShellContent .topbar {
          max-width: var(--nd-content-max) !important;
          margin: 0 auto 24px !important;
          padding: 0 !important;
          background: transparent !important;
          border: 0 !important;
          min-height: 0 !important;
        }

        .ndShellContent .topbar .profile {
          display: none !important;
        }

        .ndShellContent .topbar .search-wrapper {
          width: min(720px, 100%) !important;
        }

        /* =========================================================
           TYPOGRAPHY
        ========================================================== */

        .ndShellContent h1 {
          color: var(--nd-text) !important;
          font-size: clamp(30px, 2.25vw, 42px) !important;
          line-height: 1.12 !important;
          letter-spacing: -0.035em !important;
          font-weight: 700 !important;
        }

        .ndShellContent h2 {
          color: var(--nd-text) !important;
          font-size: clamp(20px, 1.45vw, 26px) !important;
          line-height: 1.25 !important;
          letter-spacing: -0.02em !important;
          font-weight: 700 !important;
        }

        .ndShellContent h3,
        .ndShellContent h4,
        .ndShellContent strong,
        .ndShellContent b {
          color: inherit;
          font-weight: 700 !important;
        }

        .ndShellContent p {
          font-size: 14px;
          line-height: 1.55;
        }

        .ndShellContent .eyebrow,
        .ndShellContent .sectionEyebrow,
        .ndShellContent .slotKicker,
        .ndShellContent .miniLabel,
        .ndShellContent .fieldLabel,
        .ndShellContent label {
          font-weight: 700 !important;
          letter-spacing: .045em !important;
        }

        /* =========================================================
           PAGE HEADERS
        ========================================================== */

        .ndShellContent .pageHeader,
        .ndShellContent .topHeader,
        .ndShellContent .dashboardPage > .hero,
        .ndShellContent .page > header,
        .ndShellContent .imagesPage > header {
          width: 100%;
          max-width: var(--nd-content-max) !important;
          margin: 0 auto 24px !important;
        }

        .ndShellContent .pageHeader,
        .ndShellContent .topHeader,
        .ndShellContent .page > header,
        .ndShellContent .imagesPage > header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
        }

        .ndShellContent .pageHeader p,
        .ndShellContent .topHeader p,
        .ndShellContent .page > header p,
        .ndShellContent .imagesPage > header p {
          color: var(--nd-muted) !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
        }

        .ndShellContent .eyebrow,
        .ndShellContent .sectionEyebrow {
          color: var(--nd-accent) !important;
          font-size: 11px !important;
          text-transform: uppercase;
        }

        /* =========================================================
           SURFACES / CARDS
        ========================================================== */

        .ndShellContent .section,
        .ndShellContent .filterCard,
        .ndShellContent .filterPanel,
        .ndShellContent .syncPanel,
        .ndShellContent .productSlot,
        .ndShellContent .contextCard,
        .ndShellContent .winningCard,
        .ndShellContent .sourceCard,
        .ndShellContent .resultSection,
        .ndShellContent .results,
        .ndShellContent .runHeader,
        .ndShellContent .resultCard,
        .ndShellContent .assetCard,
        .ndShellContent .creativeCard,
        .ndShellContent .flowCard,
        .ndShellContent .capabilityCard,
        .ndShellContent .jobCard,
        .ndShellContent article,
        .ndShellContent .modal {
          border-color: var(--nd-border) !important;
          box-shadow: none;
        }

        html[data-theme="dark"] .ndShellContent .section,
        html[data-theme="dark"] .ndShellContent .filterCard,
        html[data-theme="dark"] .ndShellContent .filterPanel,
        html[data-theme="dark"] .ndShellContent .syncPanel,
        html[data-theme="dark"] .ndShellContent .productSlot,
        html[data-theme="dark"] .ndShellContent .contextCard,
        html[data-theme="dark"] .ndShellContent .winningCard,
        html[data-theme="dark"] .ndShellContent .sourceCard,
        html[data-theme="dark"] .ndShellContent .resultSection,
        html[data-theme="dark"] .ndShellContent .results,
        html[data-theme="dark"] .ndShellContent .resultCard,
        html[data-theme="dark"] .ndShellContent .assetCard,
        html[data-theme="dark"] .ndShellContent .creativeCard,
        html[data-theme="dark"] .ndShellContent .flowCard,
        html[data-theme="dark"] .ndShellContent .capabilityCard,
        html[data-theme="dark"] .ndShellContent .jobCard,
        html[data-theme="dark"] .ndShellContent article,
        html[data-theme="dark"] .ndShellContent .modal {
          background: var(--nd-surface) !important;
          color: var(--nd-text) !important;
          border-color: var(--nd-border) !important;
        }

        /* Make nested soft blocks coherent in both themes. */
        .ndShellContent .statusBox,
        .ndShellContent .productImageOnlyNotice,
        .ndShellContent .productRule,
        .ndShellContent .distributionNote,
        .ndShellContent .runPlan,
        .ndShellContent .resultBox,
        .ndShellContent .summaryMetric,
        .ndShellContent .info-block,
        .ndShellContent .settingHelp,
        .ndShellContent .emptyState,
        .ndShellContent .empty,
        .ndShellContent .creativeStatus,
        .ndShellContent .noImage,
        .ndShellContent .no-image {
          background: var(--nd-surface-soft) !important;
          color: var(--nd-text-soft) !important;
          border-color: var(--nd-border-soft) !important;
        }

        /* =========================================================
           FORMS
        ========================================================== */

        .ndShellContent input,
        .ndShellContent select,
        .ndShellContent textarea,
        .ndShellContent .input,
        .ndShellContent .top-search,
        .ndShellContent .urlInput {
          min-height: 44px;
          color: var(--nd-text) !important;
          background: var(--nd-input) !important;
          border-color: var(--nd-input-border) !important;
          border-radius: 8px !important;
          font-size: 14px !important;
        }

        .ndShellContent textarea,
        .ndShellContent .textarea {
          min-height: 116px;
        }

        .ndShellContent input::placeholder,
        .ndShellContent textarea::placeholder {
          color: var(--nd-faint) !important;
        }

        /* =========================================================
           BUTTONS
        ========================================================== */

        .ndShellContent button,
        .ndShellContent a[class*="Button"],
        .ndShellContent .generateButton,
        .ndShellContent .backButton {
          font-weight: 700 !important;
        }

        .ndShellContent .primaryButton,
        .ndShellContent .useButton,
        .ndShellContent .use-large,
        .ndShellContent .generateButton,
        .ndShellContent .syncButton,
        .ndShellContent .resultActionButton.primary,
        .ndShellContent .generateBar button {
          background: #1264a3 !important;
          border-color: #1264a3 !important;
          color: #ffffff !important;
        }

        .ndShellContent .primaryButton:hover,
        .ndShellContent .useButton:hover,
        .ndShellContent .use-large:hover,
        .ndShellContent .generateButton:hover,
        .ndShellContent .syncButton:hover,
        .ndShellContent .generateBar button:hover:not(:disabled) {
          background: #0b568d !important;
          border-color: #0b568d !important;
          color: #ffffff !important;
        }

        .ndShellContent .secondaryButton,
        .ndShellContent .clearButton,
        .ndShellContent .clearFilterButton,
        .ndShellContent .clearWorkspaceButton,
        .ndShellContent .libraryHeaderButton,
        .ndShellContent .addProductButton,
        .ndShellContent .assetActions a,
        .ndShellContent .cardFooter button,
        .ndShellContent .toolbar button,
        .ndShellContent .pagination button,
        .ndShellContent .ratio,
        .ndShellContent .ratioCard {
          background: var(--nd-surface) !important;
          color: var(--nd-text) !important;
          border-color: var(--nd-border) !important;
        }

        .ndShellContent .secondaryButton:hover,
        .ndShellContent .clearButton:hover,
        .ndShellContent .clearFilterButton:hover,
        .ndShellContent .clearWorkspaceButton:hover,
        .ndShellContent .libraryHeaderButton:hover,
        .ndShellContent .addProductButton:hover,
        .ndShellContent .assetActions a:hover,
        .ndShellContent .cardFooter button:hover,
        .ndShellContent .toolbar button:hover,
        .ndShellContent .pagination button:hover:not(:disabled) {
          background: var(--nd-surface-hover) !important;
          color: var(--nd-text) !important;
        }

        /* =========================================================
           SELECTED / ACTIVE STATES
           Fixes the previous white-on-white dark-mode bug.
        ========================================================== */

        .ndShellContent .selected,
        .ndShellContent .choice.selected,
        .ndShellContent .model.selected,
        .ndShellContent .variantCard.selected,
        .ndShellContent .ratio.active,
        .ndShellContent .ratioCard.active,
        .ndShellContent .tab.active,
        .ndShellContent .toolbar button.active,
        .ndShellContent .activeFilterBar,
        .ndShellContent .productPill.active,
        .ndShellContent .segmented button.active {
          background: var(--nd-surface-selected) !important;
          color: var(--nd-accent-text) !important;
          border-color: var(--nd-accent) !important;
        }

        .ndShellContent .selected *,
        .ndShellContent .choice.selected *,
        .ndShellContent .model.selected *,
        .ndShellContent .variantCard.selected *,
        .ndShellContent .ratio.active *,
        .ndShellContent .ratioCard.active *,
        .ndShellContent .tab.active *,
        .ndShellContent .toolbar button.active *,
        .ndShellContent .productPill.active *,
        .ndShellContent .segmented button.active * {
          color: inherit !important;
        }

        /* Generate cards specifically use .model and .variantCard. */
        html[data-theme="dark"] .ndShellContent .model,
        html[data-theme="dark"] .ndShellContent .variantCard,
        html[data-theme="dark"] .ndShellContent .choice,
        html[data-theme="dark"] .ndShellContent .ratio,
        html[data-theme="dark"] .ndShellContent .ratioCard {
          background: var(--nd-surface-raised) !important;
          color: var(--nd-text) !important;
          border-color: var(--nd-border) !important;
        }

        html[data-theme="dark"] .ndShellContent .model.selected,
        html[data-theme="dark"] .ndShellContent .variantCard.selected,
        html[data-theme="dark"] .ndShellContent .choice.selected,
        html[data-theme="dark"] .ndShellContent .ratio.active,
        html[data-theme="dark"] .ndShellContent .ratioCard.active {
          background: #17384e !important;
          color: #d9f4ff !important;
          border-color: #36c5f0 !important;
        }

        /* =========================================================
           MISC DARK MODE CONTRAST
        ========================================================== */

        html[data-theme="dark"] .ndShellContent .pageHeader,
        html[data-theme="dark"] .ndShellContent .topHeader,
        html[data-theme="dark"] .ndShellContent .dashboardPage,
        html[data-theme="dark"] .ndShellContent .imagesPage,
        html[data-theme="dark"] .ndShellContent .page,
        html[data-theme="dark"] .ndShellContent .main,
        html[data-theme="dark"] .ndShellContent .app,
        html[data-theme="dark"] .ndShellContent .app-shell {
          color: var(--nd-text) !important;
          background-color: var(--nd-page) !important;
        }

        html[data-theme="dark"] .ndShellContent p,
        html[data-theme="dark"] .ndShellContent .description,
        html[data-theme="dark"] .ndShellContent .subheadline,
        html[data-theme="dark"] .ndShellContent .mutedPending,
        html[data-theme="dark"] .ndShellContent .creativeMeta,
        html[data-theme="dark"] .ndShellContent .assetMeta,
        html[data-theme="dark"] .ndShellContent .jobMeta,
        html[data-theme="dark"] .ndShellContent .slug,
        html[data-theme="dark"] .ndShellContent .meta,
        html[data-theme="dark"] .ndShellContent .helper {
          color: var(--nd-muted) !important;
        }

        html[data-theme="dark"] .ndShellContent img {
          background-color: #ffffff;
        }

        html[data-theme="dark"] .ndShellContent .modalBackdrop,
        html[data-theme="dark"] .ndShellContent .modal-overlay {
          background: rgba(0, 0, 0, .66) !important;
        }

        /* Keep image media areas visually neutral, not page-dark. */
        .ndShellContent .imageWrap,
        .ndShellContent .assetImage,
        .ndShellContent .main-image,
        .ndShellContent .winningPreview,
        .ndShellContent .resultMedia {
          background: #f3f4f6 !important;
        }

        /* Full-width responsive grids with consistent density. */
        .ndShellContent .creativeGrid,
        .ndShellContent .assetGrid {
          gap: 16px !important;
        }

        @media (min-width: 1500px) {
          .ndShellContent .creativeGrid,
          .ndShellContent .assetGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 1100px) {
          :root {
            --nd-page-padding: 24px;
          }
        }

        @media (max-width: 760px) {
          :root {
            --nd-sidebar-width: 0px;
            --nd-page-padding: 18px;
          }

          .ndShell {
            display: block;
          }

          .ndShellContent {
            width: 100%;
            margin-left: 0;
          }

          .ndShellContent .pageHeader,
          .ndShellContent .topHeader,
          .ndShellContent .page > header,
          .ndShellContent .imagesPage > header {
            flex-direction: column;
            align-items: stretch;
          }

          .ndShellContent h1 {
            font-size: 30px !important;
          }
        }
      `}</style>
    </div>
  );
}
