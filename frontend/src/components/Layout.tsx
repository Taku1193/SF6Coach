import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type LayoutProps = {
  children: ReactNode;
  hideNavigation?: boolean;
};

export function Layout({ children, hideNavigation = false }: LayoutProps) {
  const location = useLocation();
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter");

  return (
    <div className="shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">SF6 Growth Notes</p>
          <h1>SF6 Coach</h1>
        </div>
        {!hideNavigation ? (
          <nav className="nav-links" aria-label="Primary">
            <Link className={location.pathname.startsWith("/notes") ? "active" : ""} to="/notes">
              ノート一覧
            </Link>
            <Link className={location.pathname === "/consultation" ? "active" : ""} to="/consultation">
              AI相談
            </Link>
            <Link className={location.pathname === "/" ? "active" : ""} to="/">
              キャラ変更
            </Link>
          </nav>
        ) : null}
        {selectedCharacter ? (
          <div className="character-badge">
            <span>使用キャラ</span>
            <strong>{selectedCharacter}</strong>
          </div>
        ) : null}
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
