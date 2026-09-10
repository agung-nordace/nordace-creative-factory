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

type ThemeMode =
  | "light"
  | "dark"
  | "system";

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

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;

  if (mode === "system") {
    root.dataset.theme =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";

    return;
  }

  root.dataset.theme = mode;
}

export default function NdAppSidebar() {
  const pathname = usePathname();

  const [userEmail, setUserEmail] =
    useState("");

  const [signingOut, setSigningOut] =
    useState(false);

  const [theme, setTheme] =
    useState<ThemeMode>("light");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || "");
    });

    const saved =
      localStorage.getItem(
        "nd-theme"
      ) as ThemeMode | null;

    const initial: ThemeMode =
      saved === "light" ||
      saved === "dark" ||
      saved === "system"
        ? saved
        : "light";

    setTheme(initial);
    applyTheme(initial);

    const media =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const onThemeChange = () => {
      if (
        localStorage.getItem(
          "nd-theme"
        ) === "system"
      ) {
        applyTheme("system");
      }
    };

    media.addEventListener(
      "change",
      onThemeChange
    );

    return () => {
      media.removeEventListener(
        "change",
        onThemeChange
      );
    };
  }, []);

  function changeTheme(
    nextTheme: ThemeMode
  ) {
    setTheme(nextTheme);

    localStorage.setItem(
      "nd-theme",
      nextTheme
    );

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
        <div className="ndBrandMark">
          N
        </div>

        <div className="ndBrandText">
          <strong>ND Creative</strong>
          <span>Factory</span>
        </div>
      </div>

      <div className="ndNavHeading">
        Workspace
      </div>

      <nav className="ndNavigation">
        {NAV_ITEMS.map((item) => {
          const active =
            isActivePath(
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
              onClick={() => {
                window.location.href =
                  item.href;
              }}
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
        <div className="ndProfile">
          <div className="ndAvatar">
            {(userEmail || "U")
              .slice(0, 1)
              .toUpperCase()}
          </div>

          <div className="ndProfileText">
            <strong>
              {userEmail
                ? userEmail.split("@")[0]
                : "User"}
            </strong>

            <span>
              {userEmail || "Signed in"}
            </span>
          </div>
        </div>

        <div className="ndAppearance">
          <span className="ndAppearanceLabel">
            Appearance
          </span>

          <div className="ndThemeSegment">
            {(
              [
                ["light", "Light"],
                ["dark", "Dark"],
                ["system", "Auto"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={
                  theme === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  changeTheme(value)
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="ndUtilityButton"
          onClick={() => {
            window.location.href =
              "/settings";
          }}
        >
          <span>⚙</span>
          Settings
        </button>

        <button
          type="button"
          className="ndUtilityButton"
          onClick={signOut}
          disabled={signingOut}
        >
          <span>↪</span>
          {signingOut
            ? "Signing out..."
            : "Sign Out"}
        </button>
      </div>

      <style jsx>{`
        .ndSidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 100;
          width: 232px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 13px 10px 12px;
          border-right: 1px solid rgba(255,255,255,.06);
          background: var(--nd-sidebar, #19171d);
          color: var(--nd-sidebar-text, #e8e7e9);
        }

        .ndWorkspaceBrand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 5px 8px 13px;
        }

        .ndBrandMark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex: 0 0 34px;
          border-radius: 8px;
          background: #1264a3;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
        }

        .ndBrandText {
          min-width: 0;
          display: grid;
          gap: 1px;
        }

        .ndBrandText strong {
          color: #fff;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 700;
        }

        .ndBrandText span {
          color: var(--nd-sidebar-muted, #aaa8ad);
          font-size: 11px;
          line-height: 1.2;
        }

        .ndNavHeading {
          padding: 4px 10px 7px;
          color: var(--nd-sidebar-muted, #aaa8ad);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .065em;
          text-transform: uppercase;
        }

        .ndNavigation {
          display: grid;
          gap: 2px;
        }

        .ndNavItem,
        .ndUtilityButton {
          width: 100%;
          min-height: 38px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 7px;
          padding: 0 10px;
          background: transparent;
          color: var(--nd-sidebar-text, #e8e7e9);
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition:
            background .12s ease,
            color .12s ease;
        }

        .ndNavItem:hover,
        .ndUtilityButton:hover:not(:disabled) {
          background: var(--nd-sidebar-hover, #27242c);
          color: #fff;
        }

        .ndNavItem.active {
          background: var(--nd-sidebar-active, #1264a3);
          color: #fff;
        }

        .ndNavIcon {
          width: 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 15px;
          font-size: 12px;
        }

        .ndSidebarBottom {
          margin-top: auto;
          display: grid;
          gap: 6px;
        }

        .ndProfile {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 9px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px;
          background: rgba(255,255,255,.03);
        }

        .ndAvatar {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          flex: 0 0 28px;
          border-radius: 7px;
          background: #1264a3;
          color: #fff;
          font-size: 11px;
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
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .ndProfileText strong {
          color: #fff;
          font-size: 11px;
          font-weight: 700;
        }

        .ndProfileText span {
          color: var(--nd-sidebar-muted, #aaa8ad);
          font-size: 10px;
        }

        .ndAppearance {
          padding: 9px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px;
          background: rgba(255,255,255,.025);
        }

        .ndAppearanceLabel {
          display: block;
          margin-bottom: 6px;
          color: var(--nd-sidebar-muted, #aaa8ad);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .055em;
          text-transform: uppercase;
        }

        .ndThemeSegment {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3px;
          padding: 3px;
          border-radius: 7px;
          background: rgba(255,255,255,.05);
        }

        .ndThemeSegment button {
          min-width: 0;
          min-height: 28px;
          border: 0;
          border-radius: 5px;
          background: transparent;
          color: var(--nd-sidebar-muted, #aaa8ad);
          font: inherit;
          font-size: 9px;
          font-weight: 600;
          cursor: pointer;
        }

        .ndThemeSegment button:hover {
          color: #fff;
        }

        .ndThemeSegment button.active {
          background: rgba(255,255,255,.12);
          color: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,.16);
        }

        .ndUtilityButton {
          min-height: 35px;
          color: var(--nd-sidebar-muted, #aaa8ad);
          font-size: 11px;
        }

        .ndUtilityButton:disabled {
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
            min-height: auto;
            padding: 2px 4px 8px;
          }

          .ndNavHeading,
          .ndSidebarBottom {
            display: none;
          }

          .ndNavigation {
            display: flex;
            overflow-x: auto;
            gap: 4px;
            padding-bottom: 2px;
          }

          .ndNavItem {
            width: auto;
            min-width: max-content;
            min-height: 36px;
            padding: 0 9px;
          }
        }
      `}</style>
    </aside>
  );
}
