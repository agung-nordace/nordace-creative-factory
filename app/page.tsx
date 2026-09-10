"use client";

import { useRouter } from "next/navigation";
import NdWorkspaceShell from "@/components/nd-workspace-shell";

const FLOW = [
  {
    step: "01",
    title: "Choose your product",
    description:
      "Start from the product library, confirm the SKU/color, and keep clear product references ready for Product Lock.",
    href: "/products",
    action: "Open Products",
    icon: "□",
  },
  {
    step: "02",
    title: "Choose the landing-page context",
    description:
      "Use an existing landing page so the creative engine understands the real angle, audience, offer, headline, and marketing message.",
    href: "/landing-pages",
    action: "Open Landing Pages",
    icon: "▤",
  },
  {
    step: "03",
    title: "Generate creative variations",
    description:
      "Select product colors, optional winning-ad inspiration, creative models, output count, aspect ratio, and your creative direction.",
    href: "/generate?restore=1",
    action: "Start Generating",
    icon: "✦",
  },
  {
    step: "04",
    title: "Review, edit & repurpose",
    description:
      "Every finished output is saved in the generated library. Edit an approved ad, download it, or repurpose it into other placements.",
    href: "/generated-library",
    action: "Open Generated Library",
    icon: "▣",
  },
];

const CAPABILITIES = [
  {
    title: "Product Lock",
    text: "Use exact product/color references so shape, material, handles, hardware and visual identity remain authoritative.",
  },
  {
    title: "LP Intelligence",
    text: "Creative direction can be grounded in the actual landing-page message instead of repeating only one headline.",
  },
  {
    title: "Creative Models",
    text: "Generate UGC, testimonial, billboard, comparison, social proof, lifestyle, feature and native-style concepts from one workflow.",
  },
  {
    title: "Post-Generation Workflow",
    text: "Save outputs, edit approved creatives, repurpose ratios and keep the work organized by product.",
  },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <NdWorkspaceShell>
      <main className="dashboardPage">
        <header className="hero">
          <div className="heroCopy">
            <div className="eyebrow">ND CREATIVE FACTORY</div>

            <h1>
              From product references to finished ad creatives.
            </h1>

            <p>
              One workspace for preparing product truth, selecting the
              marketing context, generating multiple creative concepts,
              and managing the final outputs.
            </p>

            <div className="heroActions">
              <button
                className="primaryButton"
                onClick={() => router.push("/generate?restore=1")}
              >
                ✦ Start Generating
              </button>

              <button
                className="secondaryButton"
                onClick={() => router.push("/generated-library")}
              >
                ▣ View Generated Library
              </button>
            </div>
          </div>

          <div className="heroSystem">
            <div className="systemTop">
              <span className="statusDot" />
              <strong>Creative Factory Workflow</strong>
            </div>

            <div className="miniFlow">
              <div>
                <span>1</span>
                <p>Product</p>
              </div>
              <i>→</i>
              <div>
                <span>2</span>
                <p>LP Context</p>
              </div>
              <i>→</i>
              <div>
                <span>3</span>
                <p>Generate</p>
              </div>
              <i>→</i>
              <div>
                <span>4</span>
                <p>Library</p>
              </div>
            </div>

            <div className="systemNote">
              <strong>Recommended first run</strong>
              <span>
                1 product color · 4 Creative Models · 4 variations · 1:1
              </span>
            </div>
          </div>
        </header>

        <section className="introSection">
          <div>
            <div className="sectionEyebrow">HOW TO USE IT</div>
            <h2>Creative Factory flow</h2>
          </div>

          <p>
            Follow these four stages. Every card is clickable and takes you
            directly to the correct workspace.
          </p>
        </section>

        <section className="flowGrid">
          {FLOW.map((item) => (
            <button
              key={item.step}
              className="flowCard"
              onClick={() => router.push(item.href)}
            >
              <div className="flowCardTop">
                <span className="flowIcon">{item.icon}</span>
                <span className="stepNumber">{item.step}</span>
              </div>

              <h3>{item.title}</h3>
              <p>{item.description}</p>

              <div className="cardAction">
                {item.action}
                <span>→</span>
              </div>
            </button>
          ))}
        </section>

        <section className="capabilitySection">
          <div className="sectionHeader">
            <div>
              <div className="sectionEyebrow">WHAT THE SYSTEM DOES</div>
              <h2>Built for the complete creative workflow</h2>
            </div>
          </div>

          <div className="capabilityGrid">
            {CAPABILITIES.map((item) => (
              <article key={item.title} className="capabilityCard">
                <div className="check">✓</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="quickStart">
          <div>
            <div className="sectionEyebrow">QUICK START</div>
            <h2>Ready to make a new batch?</h2>
            <p>
              Open Generate when your product references are ready. Your
              current Generate workspace is preserved while you move between
              the Library and other post-generation tools.
            </p>
          </div>

          <button
            onClick={() => router.push("/generate?restore=1")}
          >
            ✦ Open Creative Generator
          </button>
        </section>

        <style jsx>{`
          .dashboardPage {
            min-height: 100vh;
            padding: 34px 38px 52px;
            background: #f8fafc;
            color: #0f172a;
          }

          .hero {
            max-width: 1460px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: minmax(0, 1.25fr) minmax(360px, .75fr);
            gap: 22px;
            padding: 34px;
            border: 1px solid #dbe3ee;
            border-radius: 16px;
            background: #fff;
          }

          .eyebrow,
          .sectionEyebrow {
            color: #2563eb;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .11em;
          }

          .hero h1 {
            max-width: 780px;
            margin: 10px 0 12px;
            font-size: clamp(34px, 4vw, 56px);
            line-height: 1.02;
            letter-spacing: -.04em;
          }

          .heroCopy > p {
            max-width: 760px;
            margin: 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.65;
          }

          .heroActions {
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
            margin-top: 24px;
          }

          .primaryButton,
          .secondaryButton,
          .quickStart button {
            min-height: 44px;
            border-radius: 8px;
            padding: 0 15px;
            font-size: 12px;
            font-weight: 850;
            cursor: pointer;
          }

          .primaryButton,
          .quickStart button {
            border: 1px solid #2563eb;
            background: #2563eb;
            color: #fff;
          }

          .secondaryButton {
            border: 1px solid #cbd5e1;
            background: #fff;
            color: #334155;
          }

          .heroSystem {
            align-self: stretch;
            padding: 20px;
            border: 1px solid #bfdbfe;
            border-radius: 12px;
            background: #eff6ff;
          }

          .systemTop {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
          }

          .statusDot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #16a34a;
            box-shadow: 0 0 0 4px rgba(22, 163, 74, .12);
          }

          .miniFlow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 7px;
            margin: 24px 0;
          }

          .miniFlow div {
            flex: 1 1 0;
            min-width: 0;
            text-align: center;
          }

          .miniFlow span {
            width: 30px;
            height: 30px;
            display: grid;
            place-items: center;
            margin: 0 auto 6px;
            border-radius: 50%;
            background: #2563eb;
            color: white;
            font-size: 11px;
            font-weight: 900;
          }

          .miniFlow p {
            margin: 0;
            color: #334155;
            font-size: 10px;
            font-weight: 800;
          }

          .miniFlow i {
            color: #93c5fd;
            font-style: normal;
          }

          .systemNote {
            display: grid;
            gap: 4px;
            padding: 12px;
            border: 1px solid #dbeafe;
            border-radius: 8px;
            background: rgba(255,255,255,.72);
          }

          .systemNote strong {
            font-size: 11px;
          }

          .systemNote span {
            color: #64748b;
            font-size: 10px;
            line-height: 1.45;
          }

          .introSection,
          .sectionHeader {
            max-width: 1460px;
            margin: 28px auto 12px;
            display: flex;
            align-items: end;
            justify-content: space-between;
            gap: 20px;
          }

          .introSection h2,
          .sectionHeader h2,
          .quickStart h2 {
            margin: 5px 0 0;
            font-size: 23px;
            letter-spacing: -.02em;
          }

          .introSection > p {
            max-width: 520px;
            margin: 0;
            color: #64748b;
            font-size: 12px;
            line-height: 1.5;
            text-align: right;
          }

          .flowGrid {
            max-width: 1460px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
          }

          .flowCard {
            min-height: 290px;
            display: flex;
            flex-direction: column;
            border: 1px solid #dbe3ee;
            border-radius: 12px;
            padding: 18px;
            background: #fff;
            color: inherit;
            text-align: left;
            cursor: pointer;
            transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
          }

          .flowCard:hover {
            transform: translateY(-2px);
            border-color: #93c5fd;
            box-shadow: 0 12px 30px rgba(15,23,42,.07);
          }

          .flowCardTop {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .flowIcon {
            width: 38px;
            height: 38px;
            display: grid;
            place-items: center;
            border-radius: 9px;
            background: #eff6ff;
            color: #2563eb;
            font-weight: 900;
          }

          .stepNumber {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: .08em;
          }

          .flowCard h3 {
            margin: 26px 0 8px;
            font-size: 17px;
          }

          .flowCard p {
            margin: 0;
            color: #64748b;
            font-size: 12px;
            line-height: 1.6;
          }

          .cardAction {
            margin-top: auto;
            padding-top: 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #1d4ed8;
            font-size: 11px;
            font-weight: 900;
          }

          .capabilitySection {
            max-width: 1460px;
            margin: 30px auto 0;
          }

          .sectionHeader {
            margin: 0 0 12px;
          }

          .capabilityGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .capabilityCard {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 12px;
            padding: 17px;
            border: 1px solid #dbe3ee;
            border-radius: 10px;
            background: #fff;
          }

          .check {
            width: 26px;
            height: 26px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: #dcfce7;
            color: #15803d;
            font-size: 11px;
            font-weight: 900;
          }

          .capabilityCard h3 {
            margin: 2px 0 5px;
            font-size: 13px;
          }

          .capabilityCard p {
            margin: 0;
            color: #64748b;
            font-size: 11px;
            line-height: 1.55;
          }

          .quickStart {
            max-width: 1460px;
            margin: 28px auto 0;
            padding: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 22px;
            border-radius: 13px;
            background: #101827;
            color: white;
          }

          .quickStart p {
            max-width: 760px;
            margin: 7px 0 0;
            color: #cbd5e1;
            font-size: 12px;
            line-height: 1.55;
          }

          .quickStart button {
            flex: 0 0 auto;
          }

          @media (max-width: 1120px) {
            .hero {
              grid-template-columns: 1fr;
            }

            .flowGrid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 760px) {
            .dashboardPage {
              padding: 18px;
            }

            .hero {
              padding: 22px;
            }

            .introSection,
            .quickStart {
              align-items: flex-start;
              flex-direction: column;
            }

            .introSection > p {
              text-align: left;
            }

            .flowGrid,
            .capabilityGrid {
              grid-template-columns: 1fr;
            }

            .quickStart button {
              width: 100%;
            }
          }
        `}</style>
      </main>
    </NdWorkspaceShell>
  );
}
