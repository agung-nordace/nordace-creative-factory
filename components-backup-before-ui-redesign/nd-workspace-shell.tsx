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
          --nd-sidebar-width: 232px;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
        }

        .ndShell {
          min-height: 100vh;
          width: 100%;
          background: var(--nd-page, #f8f8fa);
        }

        .ndShellContent {
          min-width: 0;
          min-height: 100vh;
          width: calc(100% - var(--nd-sidebar-width));
          margin-left: var(--nd-sidebar-width);
          background: var(--nd-page, #f8f8fa);
        }

        .ndShellContent > * {
          width: 100%;
          max-width: none;
        }

        /*
         * Legacy page-local sidebars are hidden because the shared
         * application sidebar is the single navigation source.
         */
        .ndShellContent > .app > .sidebar,
        .ndShellContent .app > .sidebar,
        .ndShellContent > .sidebar {
          display: none !important;
        }

        .ndShellContent > .app > .main,
        .ndShellContent .app > .main {
          width: 100% !important;
          max-width: none !important;
          margin-left: 0 !important;
        }

        .ndShellContent > .app {
          width: 100%;
          min-height: 100vh;
        }

        @media (max-width: 760px) {
          .ndShell {
            display: block;
          }

          .ndShellContent {
            width: 100%;
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
