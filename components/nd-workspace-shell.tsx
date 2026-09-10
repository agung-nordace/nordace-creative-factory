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
        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #f8fafc;
          color: #0f172a;
        }

        body {
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .ndShell {
          min-height: 100vh;
          background: #f8fafc;
        }

        .ndShellContent {
          min-height: 100vh;
          margin-left: 232px;
          background: #f8fafc;
        }

        /*
         * Hide any old page-local sidebar so route pages can be
         * migrated gradually without showing two different shells.
         */
        .ndShellContent > .app > .sidebar,
        .ndShellContent .app > .sidebar,
        .ndShellContent > .sidebar {
          display: none !important;
        }

        /*
         * Normalize old pages that previously reserved space for
         * their own sidebar.
         */
        .ndShellContent > .app > .main,
        .ndShellContent .app > .main {
          margin-left: 0 !important;
        }

        .ndShellContent > .app {
          min-height: 100vh;
        }

        @media (max-width: 760px) {
          .ndShell {
            display: block;
          }

          .ndShellContent {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
