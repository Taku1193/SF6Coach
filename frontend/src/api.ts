import type {
  AiConsultationRequest,
  AiConsultationResponse,
  CreateBattleRecordPayload,
  CreateVideoSummaryPayload,
  Note,
  NotesResponse,
  UpdateNotePayload
} from "@shared/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const raw = await response.text();
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      throw new Error(parsed.message || "API request failed.");
    } catch {
      throw new Error(raw || "API request failed.");
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  listNotes(character: string) {
    const params = new URLSearchParams({ character });
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
  updateNote(noteId: string, payload: UpdateNotePayload) {
    return request<{ note: Note }>(`/notes/${noteId}`, {
      method: "PUT",
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
  }
};
