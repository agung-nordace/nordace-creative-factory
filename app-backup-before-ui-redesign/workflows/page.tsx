"use client";

import NdWorkspaceShell from "@/components/nd-workspace-shell";

const WORKFLOWS = [
  {
    title: "Creative Generation",
    status: "Active",
    description:
      "Product Lock → LP Context → optional Winning Ad → Creative Models → final outputs.",
    action: "Open Generate",
    href: "/generate",
  },
  {
    title: "Creative Editing",
    status: "Active",
    description:
      "Take an approved generated creative and revise only the requested parts while preserving product fidelity.",
    action: "Open Library",
    href: "/generated-library",
  },
  {
    title: "Repurpose Sizes",
    status: "Active",
    description:
      "Recompose approved creatives into 1:1, 4:5, 1.91:1 and 9:16 without simple crop/stretch.",
    action: "Open Library",
    href: "/generated-library",
  },
  {
    title: "Automated Creative QA",
    status: "Next",
    description:
      "Planned layer for typo checks, product-count validation, text collision detection and automatic retry.",
    action: "Coming Next",
    href: "",
  },
];

export default function WorkflowsPage() {
  return (
    <NdWorkspaceShell>
      <main className="page">
        <header>
          <div className="eyebrow">CREATIVE FACTORY</div>
          <h1>Workflows</h1>
          <p>
            The production workflows currently connected to the Creative Factory.
          </p>
        </header>

        <div className="grid">
          {WORKFLOWS.map((workflow, index) => (
            <article key={workflow.title}>
              <div className="top">
                <span className="number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span
                  className={
                    workflow.status === "Active"
                      ? "status active"
                      : "status"
                  }
                >
                  {workflow.status}
                </span>
              </div>

              <h2>{workflow.title}</h2>
              <p>{workflow.description}</p>

              <button
                disabled={!workflow.href}
                onClick={() => {
                  if (workflow.href) {
                    window.location.href = workflow.href;
                  }
                }}
              >
                {workflow.action}
                {workflow.href ? " →" : ""}
              </button>
            </article>
          ))}
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            padding: 34px;
            background: #f8fafc;
            color: #0f172a;
          }

          header,
          .grid {
            max-width: 1350px;
            margin-left: auto;
            margin-right: auto;
          }

          header {
            margin-bottom: 20px;
          }

          .eyebrow {
            color: #2563eb;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .1em;
          }

          h1 {
            margin: 7px 0 5px;
            font-size: 31px;
          }

          header p {
            margin: 0;
            color: #64748b;
            font-size: 13px;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          article {
            min-height: 220px;
            display: flex;
            flex-direction: column;
            padding: 18px;
            border: 1px solid #dbe3ee;
            border-radius: 10px;
            background: white;
          }

          .top {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .number {
            color: #94a3b8;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .08em;
          }

          .status {
            padding: 5px 8px;
            border-radius: 999px;
            background: #f1f5f9;
            color: #64748b;
            font-size: 9px;
            font-weight: 850;
          }

          .status.active {
            background: #dcfce7;
            color: #15803d;
          }

          article h2 {
            margin: 25px 0 7px;
            font-size: 17px;
          }

          article p {
            margin: 0;
            color: #64748b;
            font-size: 12px;
            line-height: 1.55;
          }

          article button {
            margin-top: auto;
            width: fit-content;
            border: 0;
            padding: 0;
            background: transparent;
            color: #1d4ed8;
            font-size: 11px;
            font-weight: 850;
            cursor: pointer;
          }

          article button:disabled {
            color: #94a3b8;
            cursor: not-allowed;
          }

          @media (max-width: 760px) {
            .grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </main>
    </NdWorkspaceShell>
  );
}
