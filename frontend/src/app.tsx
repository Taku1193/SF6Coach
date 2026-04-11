import type { ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CharacterSelectionPage } from "./pages/CharacterSelectionPage";
import { NotesListPage } from "./pages/NotesListPage";
import { BattleRecordFormPage } from "./pages/BattleRecordFormPage";
import { VideoSummaryFormPage } from "./pages/VideoSummaryFormPage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { AiConsultationPage } from "./pages/AiConsultationPage";
import { Layout } from "./components/Layout";

// 使用キャラが未選択の状態では、対象画面へ入らせずトップへ戻すガードを行う。
function RequireCharacter({ children }: { children: ReactElement }) {
  const location = useLocation();
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter");

  // この MVP は「選択中キャラ」を localStorage に持つ前提なので、
  // 先にキャラ選択していない状態ではトップ画面へ戻す。
  if (!selectedCharacter && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ルーティング全体を定義し、各画面を Layout とキャラ選択ガード付きで組み立てる。
export function App() {
  return (
    <Routes>
      {/* キャラ選択だけは未選択状態でも開ける入口画面として扱う。 */}
      <Route
        path="/"
        element={
          <Layout hideNavigation>
            <CharacterSelectionPage />
          </Layout>
        }
      />
      <Route
        path="/notes"
        element={
          // ノート関連画面はすべて、現在選択中のキャラに依存する。
          <RequireCharacter>
            <Layout>
              <NotesListPage />
            </Layout>
          </RequireCharacter>
        }
      />
      <Route
        path="/notes/new/battle-record"
        element={
          <RequireCharacter>
            <Layout>
              <BattleRecordFormPage mode="create" />
            </Layout>
          </RequireCharacter>
        }
      />
      <Route
        path="/notes/new/video-summary"
        element={
          <RequireCharacter>
            <Layout>
              <VideoSummaryFormPage mode="create" />
            </Layout>
          </RequireCharacter>
        }
      />
      <Route
        path="/notes/:noteId"
        element={
          <RequireCharacter>
            <Layout>
              <NoteDetailPage />
            </Layout>
          </RequireCharacter>
        }
      />
      <Route
        path="/notes/:noteId/edit"
        element={
          <RequireCharacter>
            <Layout>
              <NoteDetailPage editMode />
            </Layout>
          </RequireCharacter>
        }
      />
      <Route
        path="/consultation"
        element={
          <RequireCharacter>
            <Layout>
              <AiConsultationPage />
            </Layout>
          </RequireCharacter>
        }
      />
    </Routes>
  );
}
