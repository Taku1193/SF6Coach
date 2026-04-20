import type { ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./components/AuthProvider";
import { AiConsultationPage } from "./pages/AiConsultationPage";
import { BattleRecordFormPage } from "./pages/BattleRecordFormPage";
import { CharacterSelectionPage } from "./pages/CharacterSelectionPage";
import { LoginPage } from "./pages/LoginPage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { NotesListPage } from "./pages/NotesListPage";
import { PasswordResetPage } from "./pages/PasswordResetPage";
import { SignUpPage } from "./pages/SignUpPage";
import { VideoSummaryFormPage } from "./pages/VideoSummaryFormPage";

// 保存済みキャラの有無から、認証後に最初に案内すべき画面を求める。
function getAuthenticatedHomePath(): string {
  return window.localStorage.getItem("sf6.selectedCharacter") ? "/notes" : "/characters";
}

// 認証初期化中はルーティングを確定させず、1枚のローディング画面だけを返す。
function AuthBootstrapScreen() {
  return (
    <div className="shell">
      <div className="panel status">認証状態を確認しています。</div>
    </div>
  );
}

// 未認証のアクセスをログイン画面へ戻し、ログイン後に元画面へ戻れるよう遷移元を保持する。
function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthBootstrapScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: `${location.pathname}${location.search}` }} to="/login" />;
  }

  return children;
}

// すでにログイン済みの利用者には、認証画面ではなくアプリ本体側へ戻ってもらう。
function PublicOnly({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthBootstrapScreen />;
  }

  if (isAuthenticated) {
    return <Navigate replace to={getAuthenticatedHomePath()} />;
  }

  return children;
}

// 使用キャラが未選択の状態では、対象画面へ入らせずキャラ選択へ戻す。
function RequireCharacter({ children }: { children: ReactElement }) {
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter");

  if (!selectedCharacter) {
    return <Navigate replace to="/characters" />;
  }

  return children;
}

// ルート直下は認証状態に応じて、ログインまたは認証後のホーム画面へ振り分ける。
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthBootstrapScreen />;
  }

  return <Navigate replace to={isAuthenticated ? getAuthenticatedHomePath() : "/login"} />;
}

// ルーティング全体を定義し、認証済みガードとキャラ選択ガードを段階的に適用する。
export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Layout hideNavigation>
              <LoginPage />
            </Layout>
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <Layout hideNavigation>
              <SignUpPage />
            </Layout>
          </PublicOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnly>
            <Layout hideNavigation>
              <PasswordResetPage />
            </Layout>
          </PublicOnly>
        }
      />
      <Route
        path="/characters"
        element={
          <RequireAuth>
            <Layout hideNavigation>
              <CharacterSelectionPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/notes"
        element={
          <RequireAuth>
            <RequireCharacter>
              <Layout>
                <NotesListPage />
              </Layout>
            </RequireCharacter>
          </RequireAuth>
        }
      />
      <Route
        path="/notes/new/battle-record"
        element={
          <RequireAuth>
            <RequireCharacter>
              <Layout>
                <BattleRecordFormPage mode="create" />
              </Layout>
            </RequireCharacter>
          </RequireAuth>
        }
      />
      <Route
        path="/notes/new/video-summary"
        element={
          <RequireAuth>
            <RequireCharacter>
              <Layout>
                <VideoSummaryFormPage mode="create" />
              </Layout>
            </RequireCharacter>
          </RequireAuth>
        }
      />
      <Route
        path="/notes/:noteId"
        element={
          <RequireAuth>
            <RequireCharacter>
              <Layout>
                <NoteDetailPage />
              </Layout>
            </RequireCharacter>
          </RequireAuth>
        }
      />
      <Route
        path="/notes/:noteId/edit"
        element={
          <RequireAuth>
            <RequireCharacter>
              <Layout>
                <NoteDetailPage editMode />
              </Layout>
            </RequireCharacter>
          </RequireAuth>
        }
      />
      <Route
        path="/consultation"
        element={
          <RequireAuth>
            <RequireCharacter>
              <Layout>
                <AiConsultationPage />
              </Layout>
            </RequireCharacter>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
