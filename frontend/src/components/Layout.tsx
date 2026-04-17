import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type LayoutProps = {
  children: ReactNode;
  hideNavigation?: boolean;
};

// 全画面共通のヘッダー、ナビゲーション、本文コンテナをまとめて提供する。
export function Layout({ children, hideNavigation = false }: LayoutProps) {
  const location = useLocation();
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter");

  // 左上のアプリ名は現在地に関わらず、画面状態を初期化するために再読み込みの起点にする。
  function handleReload() {
    window.location.reload();
  }

  return (
    <div className="shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">SF6 Growth Notes</p>
          <button className="app-title-button" onClick={handleReload} type="button">
            <h1>SF6 Coach</h1>
          </button>
        </div>
        {!hideNavigation ? (
          // 現在地が分かるように、簡易的に pathname ベースで active を切り替える。
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
          // どの画面でも「今どのキャラのノートを見ているか」を見失わないよう常に表示する。
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
