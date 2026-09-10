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

type ThemeMode = "light" | "dark" | "system";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "⌂" },
  { label: "Images", href: "/images", icon: "▧" },
  { label: "Products", href: "/products", icon: "□" },
  { label: "Landing Pages", href: "/landing-pages", icon: "▤" },
  { label: "Workflows", href: "/workflows", icon: "⌘" },
  { label: "Generate", href: "/generate", icon: "✦", activePrefixes: ["/generate"] },
  {
    label: "Library",
    href: "/generated-library",
    icon: "▣",
    activePrefixes: ["/generated-library", "/edit-creative", "/repurpose"],
  },
  { label: "Jobs", href: "/jobs", icon: "◷" },
];

function isActivePath(pathname: string, item: NavItem) {
  if (item.label === "Dashboard") return pathname === "/";
  const prefixes = item.activePrefixes || [item.href];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const actual =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;

  root.dataset.theme = actual;
  root.dataset.themeMode = mode;
}

export default function NdAppSidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || "");
    });

    const saved = localStorage.getItem("nd-theme") as ThemeMode | null;
    const initial: ThemeMode =
      saved === "light" || saved === "dark" || saved === "system"
        ? saved
        : "light";

    setTheme(initial);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onThemeChange = () => {
      if (localStorage.getItem("nd-theme") === "system") applyTheme("system");
    };

    media.addEventListener("change", onThemeChange);
    return () => media.removeEventListener("change", onThemeChange);
  }, []);

  function changeTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    localStorage.setItem("nd-theme", nextTheme);
    applyTheme(nextTheme);
  }

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

  return (
    <aside className="ndSidebar">
      <div className="ndWorkspaceBrand">
        <div className="ndBrandMark">N</div>
        <div className="ndBrandText">
          <strong>ND Creative</strong>
          <span>Factory</span>
        </div>
      </div>

      <div className="ndNavHeading">Workspace</div>

      <nav className="ndNavigation">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item);
          return (
            <button
              key={item.label}
              type="button"
              className={active ? "ndNavItem active" : "ndNavItem"}
              onClick={() => {
                window.location.href = item.href;
              }}
            >
              <span className="ndNavIcon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="ndSidebarBottom">
        <div className="ndProfile">
          <div className="ndAvatar">
            {(userEmail || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="ndProfileText">
            <strong>{userEmail ? userEmail.split("@")[0] : "User"}</strong>
            <span>{userEmail || "Signed in"}</span>
          </div>
        </div>

        <div className="ndAppearance">
          <span className="ndAppearanceLabel">Appearance</span>
          <div className="ndThemeSegment">
            {(
              [
                ["light", "Light", "☀"],
                ["dark", "Dark", "◐"],
                ["system", "Auto", "◉"],
              ] as const
            ).map(([value, label, icon]) => (
              <button
                type="button"
                key={value}
                className={theme === value ? "active" : ""}
                onClick={() => changeTheme(value)}
                aria-pressed={theme === value}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={pathname.startsWith("/settings") ? "ndUtilityItem active" : "ndUtilityItem"}
          onClick={() => {
            window.location.href = "/settings";
          }}
        >
          <span className="ndNavIcon">⚙</span>
          <span>Settings</span>
        </button>

        <button
          type="button"
          className="ndUtilityItem ndSignOut"
          onClick={signOut}
          disabled={signingOut}
        >
          <span className="ndNavIcon">↪</span>
          <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
        </button>
      </div>

      <style jsx>{`
        .ndSidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 200;
          width: var(--nd-sidebar-width, 232px);
          display: flex;
          flex-direction: column;
          padding: 14px 10px 12px;
          background: var(--nd-sidebar);
          color: var(--nd-sidebar-text);
          border-right: 1px solid rgba(255, 255, 255, .08);
        }

        .ndWorkspaceBrand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 54px;
          padding: 6px 8px 16px;
        }

        .ndBrandMark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex: 0 0 34px;
          border-radius: 8px;
          background: #1264a3;
          color: white;
          font-size: 15px;
          font-weight: 700;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.12);
        }

        .ndBrandText {
          min-width: 0;
          display: grid;
          gap: 1px;
        }

        .ndBrandText strong {
          color: white;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 700;
        }

        .ndBrandText span {
          color: var(--nd-sidebar-muted);
          font-size: 11px;
          line-height: 1.2;
        }

        .ndNavHeading {
          padding: 3px 10px 8px;
          color: var(--nd-sidebar-muted);
          font-size: 10px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .ndNavigation {
          display: grid;
          gap: 2px;
        }

        .ndNavItem,
        .ndUtilityItem {
          width: 100%;
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 0;
          border-radius: 6px;
          padding: 0 10px;
          background: transparent;
          color: var(--nd-sidebar-text);
          font-size: 13px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: background .12s ease, color .12s ease;
        }

        .ndNavItem:hover,
        .ndUtilityItem:hover:not(:disabled) {
          background: var(--nd-sidebar-hover);
          color: white;
        }

        .ndNavItem.active,
        .ndUtilityItem.active {
          background: var(--nd-sidebar-active);
          color: white;
          box-shadow: inset 3px 0 0 var(--nd-accent);
        }

        .ndNavIcon {
          width: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 18px;
          font-size: 13px;
        }

        .ndSidebarBottom {
          margin-top: auto;
          display: grid;
          gap: 7px;
        }

        .ndProfile,
        .ndAppearance {
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 9px;
          background: rgba(255,255,255,.025);
        }

        .ndProfile {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px;
        }

        .ndAvatar {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          flex: 0 0 30px;
          border-radius: 7px;
          background: #1264a3;
          color: white;
          font-size: 12px;
          font-weight: 700;
        }

        .ndProfileText {
          min-width: 0;
          display: grid;
          gap: 1px;
        }

        .ndProfileText strong,
        .ndProfileText span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ndProfileText strong {
          color: white;
          font-size: 11px;
          font-weight: 700;
        }

        .ndProfileText span {
          color: var(--nd-sidebar-muted);
          font-size: 9px;
        }

        .ndAppearance {
          padding: 9px;
        }

        .ndAppearanceLabel {
          display: block;
          margin-bottom: 7px;
          color: var(--nd-sidebar-muted);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .ndThemeSegment {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4px;
        }

        .ndThemeSegment button {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: 1px solid transparent;
          border-radius: 6px;
          background: rgba(255,255,255,.05);
          color: var(--nd-sidebar-muted);
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .ndThemeSegment button:hover {
          background: rgba(255,255,255,.09);
          color: white;
        }

        .ndThemeSegment button.active {
          background: rgba(255,255,255,.15);
          border-color: rgba(255,255,255,.18);
          color: white;
        }

        .ndUtilityItem {
          min-height: 38px;
          color: var(--nd-sidebar-muted);
        }

        .ndUtilityItem:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .ndSidebar {
            position: sticky;
            top: 0;
            width: 100%;
            height: auto;
            padding: 8px 10px;
          }

          .ndWorkspaceBrand {
            min-height: 44px;
            padding: 0 4px 8px;
          }

          .ndNavHeading,
          .ndSidebarBottom {
            display: none;
          }

          .ndNavigation {
            display: flex;
            overflow-x: auto;
            gap: 4px;
            scrollbar-width: none;
          }

          .ndNavigation::-webkit-scrollbar {
            display: none;
          }

          .ndNavItem {
            width: auto;
            min-width: max-content;
            min-height: 36px;
            padding: 0 10px;
          }
        }
      `}</style>
    </aside>
  );
}
