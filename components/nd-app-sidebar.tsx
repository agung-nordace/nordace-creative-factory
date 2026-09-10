"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  activePrefixes?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "⌂" },
  { label: "Images", href: "/images", icon: "▧" },
  { label: "Products", href: "/products", icon: "□" },
  { label: "Landing Pages", href: "/landing-pages", icon: "▤" },
  { label: "Workflows", href: "/workflows", icon: "⌘" },
  {
    label: "Generate",
    href: "/generate",
    icon: "✦",
    activePrefixes: ["/generate"],
  },
  {
    label: "Library",
    href: "/generated-library",
    icon: "▣",
    activePrefixes: [
      "/generated-library",
      "/edit-creative",
      "/repurpose",
    ],
  },
  { label: "Jobs", href: "/jobs", icon: "◷" },
];

function isActivePath(
  pathname: string,
  item: NavItem
) {
  if (item.label === "Dashboard") {
    return pathname === "/";
  }

  const prefixes =
    item.activePrefixes || [item.href];

  return prefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
  );
}

export default function NdAppSidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || "");
    });
  }, []);

  async function signOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  function navigate(href: string) {
    window.location.href = href;
  }

  return (
    <aside className="ndSidebar">
      <div className="ndBrand">
        <div className="ndBrandMark">N</div>

        <div>
          <div className="ndBrandName">
            ND Creative
          </div>

          <div className="ndBrandSub">
            Factory
          </div>
        </div>
      </div>

      <div className="ndNavLabel">
        WORKSPACE
      </div>

      <nav className="ndNav">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(
            pathname,
            item
          );

          return (
            <button
              key={item.label}
              type="button"
              className={
                active
                  ? "ndNavItem active"
                  : "ndNavItem"
              }
              onClick={() =>
                navigate(item.href)
              }
            >
              <span className="ndNavIcon">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="ndSidebarBottom">
        <div className="ndUserCard">
          <div className="ndUserAvatar">
            {(userEmail || "U").slice(0, 1).toUpperCase()}
          </div>

          <div className="ndUserInfo">
            <strong>{userEmail ? userEmail.split("@")[0] : "User"}</strong>
            <span>{userEmail || "Signed in"}</span>
          </div>
        </div>

        <button
          type="button"
          className={
            pathname.startsWith("/settings")
              ? "ndNavItem active"
              : "ndNavItem"
          }
          onClick={() =>
            navigate("/settings")
          }
        >
          <span className="ndNavIcon">
            ⚙
          </span>

          <span>
            Settings
          </span>
        </button>

        <div className="ndSignOutWrap">
          <button
            type="button"
            className="ndSignOutButton"
            onClick={signOut}
            disabled={signingOut}
          >
            <span className="ndNavIcon">↪</span>
            <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .ndSidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 232px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          padding: 20px 15px;
          background: #101827;
          color: #fff;
          border-right: 1px solid rgba(148, 163, 184, .12);
        }

        .ndBrand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 9px 22px;
        }

        .ndBrandMark {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #2563eb;
          color: #fff;
          font-size: 16px;
          font-weight: 900;
        }

        .ndBrandName {
          font-size: 15px;
          line-height: 1.1;
          font-weight: 850;
        }

        .ndBrandSub {
          margin-top: 3px;
          color: #cbd5e1;
          font-size: 11px;
          line-height: 1.1;
        }

        .ndNavLabel {
          padding: 0 10px 9px;
          color: #8fa4c3;
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .ndNav {
          display: grid;
          gap: 4px;
        }

        .ndNavItem {
          width: 100%;
          min-height: 46px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 0;
          border-radius: 8px;
          padding: 0 11px;
          background: transparent;
          color: #e2e8f0;
          font: inherit;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          transition:
            background .15s ease,
            color .15s ease;
        }

        .ndNavItem:hover {
          background: #172236;
          color: #fff;
        }

        .ndNavItem.active {
          background: #2557df;
          color: #fff;
        }

        .ndNavIcon {
          width: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 16px;
          font-size: 12px;
        }

        .ndSidebarBottom {
          margin-top: auto;
          display: grid;
          gap: 6px;
        }

        .ndUserCard {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px;
          border: 1px solid rgba(148, 163, 184, .16);
          border-radius: 9px;
          background: rgba(255, 255, 255, .03);
        }

        .ndUserAvatar {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          flex: 0 0 30px;
          border-radius: 50%;
          background: #1d4ed8;
          color: #fff;
          font-size: 11px;
          font-weight: 900;
        }

        .ndUserInfo {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .ndUserInfo strong,
        .ndUserInfo span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .ndUserInfo strong {
          color: #fff;
          font-size: 10px;
        }

        .ndUserInfo span {
          color: #94a3b8;
          font-size: 9px;
        }

        .ndSignOutButton {
          width: 100%;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(148, 163, 184, .24);
          border-radius: 8px;
          padding: 0 11px;
          background: transparent;
          color: #cbd5e1;
          font: inherit;
          font-size: 12px;
          text-align: left;
          cursor: pointer;
        }

        .ndSignOutButton:hover:not(:disabled) {
          background: #172236;
          color: #fff;
        }

        .ndSignOutButton:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .ndSidebar {
            position: sticky;
            top: 0;
            width: 100%;
            height: auto;
            padding: 10px 12px;
          }

          .ndBrand {
            padding: 0 4px 10px;
          }

          .ndNavLabel,
          .ndSidebarBottom {
            display: none;
          }

          .ndNav {
            display: flex;
            overflow-x: auto;
            gap: 5px;
            padding-bottom: 2px;
          }

          .ndNavItem {
            width: auto;
            min-width: max-content;
            min-height: 38px;
            padding: 0 10px;
          }
        }
      `}</style>
    </aside>
  );
}
