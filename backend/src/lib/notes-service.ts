import { v4 as uuidv4 } from "uuid";
import type { BattleRecordNote, CreateBattleRecordPayload, CreateVideoSummaryPayload, Note, UpdateNotePayload, VideoSummaryNote } from "@shared/types";
import { getAppUserId } from "./env";
import { getNote, listNotesByCharacter, putNote, removeNote, updatePersistedNote } from "./repository";
import { validateCreateBattleRecordPayload, validateCreateVideoSummaryPayload, validateUpdatePayload } from "./validators";

export async function listNotes(character: string): Promise<Note[]> {
  return listNotesByCharacter(character);
}

export async function getNoteById(noteId: string): Promise<Note | null> {
  return getNote(noteId);
}

export async function createBattleRecordNote(input: unknown): Promise<BattleRecordNote> {
  const payload = validateCreateBattleRecordPayload(input);
  const now = new Date().toISOString();
  // 作成時点で noteId / userId / timestamp を補完し、フロントからは業務入力だけ受け取る。
  const note: BattleRecordNote = {
    noteId: uuidv4(),
    userId: getAppUserId(),
    noteType: "battleRecord",
    createdAt: now,
    updatedAt: now,
    ...payload
  };

  return (await putNote(note)) as BattleRecordNote;
}

export async function createVideoSummaryNote(input: unknown): Promise<VideoSummaryNote> {
  const payload = validateCreateVideoSummaryPayload(input);
  const now = new Date().toISOString();
  // 動画要約ノートも対戦記録ノートと同じルールでメタ情報を付与する。
  const note: VideoSummaryNote = {
    noteId: uuidv4(),
    userId: getAppUserId(),
    noteType: "videoSummary",
    createdAt: now,
    updatedAt: now,
    ...payload
  };

  return (await putNote(note)) as VideoSummaryNote;
}

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

export async function deleteNoteById(noteId: string): Promise<boolean> {
  return removeNote(noteId);
}
