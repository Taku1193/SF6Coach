import { v4 as uuidv4 } from "uuid";
import type {
  BattleRecordNote,
  CreateBattleRecordPayload,
  CreateVideoSummaryPayload,
  Note,
  UpdateFavoritePayload,
  UpdateNotePayload,
  VideoSummaryNote
} from "@shared/types";
import { getAppUserId } from "./env";
import { getNote, listNotesByCharacter, putNote, removeNote, updatePersistedNote } from "./repository";
import { validateCreateBattleRecordPayload, validateCreateVideoSummaryPayload, validateFavoritePayload, validateUpdatePayload } from "./validators";

// 指定キャラに紐づくノート一覧を repository から取得して返す。
export async function listNotes(character: string, favoriteOnly = false): Promise<Note[]> {
  const notes = await listNotesByCharacter(character);
  return favoriteOnly ? notes.filter((note) => note.isFavorite) : notes;
}

// noteId に対応するノートを 1 件取得し、存在しなければ null を返す。
export async function getNoteById(noteId: string): Promise<Note | null> {
  return getNote(noteId);
}

// 対戦記録ノートを新規作成し、ID や timestamp を補完した上で保存する。
export async function createBattleRecordNote(input: unknown): Promise<BattleRecordNote> {
  const payload = validateCreateBattleRecordPayload(input);
  const now = new Date().toISOString();
  // 作成時点で noteId / userId / timestamp を補完し、フロントからは業務入力だけ受け取る。
  const note: BattleRecordNote = {
    noteId: uuidv4(),
    userId: getAppUserId(),
    noteType: "battleRecord",
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    ...payload
  };

  return (await putNote(note)) as BattleRecordNote;
}

// 動画要約ノートを新規作成し、ID や timestamp を補完した上で保存する。
export async function createVideoSummaryNote(input: unknown): Promise<VideoSummaryNote> {
  const payload = validateCreateVideoSummaryPayload(input);
  const now = new Date().toISOString();
  // 動画要約ノートも対戦記録ノートと同じルールでメタ情報を付与する。
  const note: VideoSummaryNote = {
    noteId: uuidv4(),
    userId: getAppUserId(),
    noteType: "videoSummary",
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    ...payload
  };

  return (await putNote(note)) as VideoSummaryNote;
}

// 既存ノートの種別を維持したまま、更新可能な項目だけを上書きして保存する。
export async function updateNoteById(noteId: string, input: unknown): Promise<Note | null> {
  const existing = await getNote(noteId);
  if (!existing) {
    return null;
  }

  const payload = validateUpdatePayload(input);
  const now = new Date().toISOString();
  // noteType は作成後に変えず、種別ごとに更新可能な項目だけを上書きする。
  const updated =
    existing.noteType === "battleRecord"
      ? {
          ...existing,
          character: payload.character ?? existing.character,
          opponentCharacter: payload.opponentCharacter ?? existing.opponentCharacter,
          result: payload.result ?? existing.result,
          goodPoints: payload.goodPoints ?? existing.goodPoints,
          improvements: payload.improvements ?? existing.improvements,
          tags: payload.tags ?? existing.tags,
          updatedAt: now
        }
      : {
          ...existing,
          character: payload.character ?? existing.character,
          videoTitle: payload.videoTitle ?? existing.videoTitle,
          url: payload.url ?? existing.url,
          summary: payload.summary ?? existing.summary,
          tags: payload.tags ?? existing.tags,
          updatedAt: now
        };

  return updatePersistedNote(updated);
}

// ノートのお気に入り状態だけを更新し、一覧と詳細の即時切替に使う。
export async function updateNoteFavoriteById(noteId: string, input: unknown): Promise<Note | null> {
  const existing = await getNote(noteId);
  if (!existing) {
    return null;
  }

  const payload: UpdateFavoritePayload = validateFavoritePayload(input);
  return updatePersistedNote({
    ...existing,
    isFavorite: payload.isFavorite,
    updatedAt: new Date().toISOString()
  });
}

// noteId に対応するノートを削除し、成否を boolean で返す。
export async function deleteNoteById(noteId: string): Promise<boolean> {
  return removeNote(noteId);
}
