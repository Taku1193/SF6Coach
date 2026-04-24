import type {
  AiConsultationRequest,
  AiConsultationResponse,
  CreateBattleRecordPayload,
  CreateGeneralNotePayload,
  CreateVideoSummaryPayload,
  FocusIssueResponse,
  Note,
  NotesResponse,
  UpdateFavoritePayload,
  UpdateNotePayload,
  UpsertFocusIssuePayload
} from "@shared/types";
import { clearStoredSession, getValidIdToken } from "./lib/cognito-auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// API の共通 fetch 処理をまとめ、成功時の JSON 解析と失敗時の message 抽出を揃える。
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const idToken = await getValidIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (idToken) {
    headers.set("Authorization", `Bearer ${idToken}`);
  }

  // フロント側の API 呼び出しはここに集約し、ヘッダーやエラー解釈を統一する。
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (response.status === 401) {
    // 認証切れ時は保存済み token を破棄し、ユーザーをログイン画面へ戻す。
    clearStoredSession();
    window.localStorage.removeItem("sf6.selectedCharacter");
    window.location.assign("/login");
    throw new Error("セッションの有効期限が切れました。再度ログインしてください。");
  }

  if (!response.ok) {
    const raw = await response.text();
    if (raw) {
      let parsedMessage = "";

      try {
        // バックエンドは { message } 形式でエラーを返すため、まず JSON として解釈する。
        const parsed = JSON.parse(raw) as { message?: string };
        parsedMessage = parsed.message ?? "";
      } catch {
        parsedMessage = "";
      }

      if (parsedMessage) {
        throw new Error(parsedMessage);
      }

      // JSON でない場合も、そのまま本文を表に出した方が調査しやすい。
      if (!raw.trim().startsWith("{")) {
        throw new Error(raw || "API request failed.");
      }

      throw new Error("API request failed.");
    }

    throw new Error("API request failed.");
  }

  if (response.status === 204) {
    // DELETE のように本文がないレスポンスにも対応する。
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  listNotes(character: string, favoriteOnly = false) {
    // 一覧 API は query string で使用キャラを渡す。
    const params = new URLSearchParams({ character });
    if (favoriteOnly) {
      params.set("favoriteOnly", "true");
    }
    return request<NotesResponse>(`/notes?${params.toString()}`);
  },
  getNote(noteId: string) {
    return request<{ note: Note }>(`/notes/${noteId}`);
  },
  createBattleRecord(payload: CreateBattleRecordPayload) {
    return request<{ note: Note }>("/notes/battle-record", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  createVideoSummary(payload: CreateVideoSummaryPayload) {
    return request<{ note: Note }>("/notes/video-summary", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  createGeneralNote(payload: CreateGeneralNotePayload) {
    return request<{ note: Note }>("/notes/general", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateNote(noteId: string, payload: UpdateNotePayload) {
    return request<{ note: Note }>(`/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  updateFavorite(noteId: string, payload: UpdateFavoritePayload) {
    return request<{ note: Note }>(`/notes/${noteId}/favorite`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deleteNote(noteId: string) {
    return request<void>(`/notes/${noteId}`, {
      method: "DELETE"
    });
  },
  consult(payload: AiConsultationRequest) {
    return request<AiConsultationResponse>("/ai-consultation", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getFocusIssue(character: string) {
    const params = new URLSearchParams({ character });
    return request<FocusIssueResponse>(`/focus-issue?${params.toString()}`);
  },
  saveFocusIssue(payload: UpsertFocusIssuePayload) {
    return request<FocusIssueResponse>("/focus-issue", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }
};
