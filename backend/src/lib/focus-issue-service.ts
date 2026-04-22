import type { FocusIssue, FocusIssueReferenceNote, FocusIssueResponse } from "@shared/types";
import { buildNoteTitle } from "@shared/types";
import { buildFocusIssueKey, getFocusIssue, getNote, putFocusIssue } from "./repository";
import { validateFocusIssuePayload } from "./validators";

// 課題に紐づく参考ノートを表示用情報へ変換し、削除済みや別キャラのノートは除外する。
async function resolveReferenceNotes(userId: string, character: string, noteIds: string[]): Promise<FocusIssueReferenceNote[]> {
  const references = await Promise.all(
    noteIds.map(async (noteId) => {
      const note = await getNote(userId, noteId);
      if (!note || note.character !== character) {
        return null;
      }

      return {
        noteId: note.noteId,
        noteType: note.noteType,
        title: buildNoteTitle(note),
        updatedAt: note.updatedAt
      };
    })
  );

  return references.filter((note): note is FocusIssueReferenceNote => note !== null);
}

// 保存済み課題を画面表示用レスポンスに整形する。
async function toFocusIssueResponse(issue: FocusIssue | null): Promise<FocusIssueResponse> {
  if (!issue) {
    return { issue: null };
  }

  const referenceNotes = await resolveReferenceNotes(issue.userId, issue.character, issue.referenceNoteIds);
  return {
    issue: {
      issueId: issue.issueId,
      character: issue.character,
      title: issue.title,
      memo: issue.memo,
      referenceNotes,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt
    }
  };
}

// 選択中キャラに紐づく現在課題を1件取得する。
export async function getFocusIssueByCharacter(userId: string, character: string): Promise<FocusIssueResponse> {
  const issue = await getFocusIssue(userId, character);
  return toFocusIssueResponse(issue);
}

// 課題を userId + character ごとに1件だけ upsert し、参考ノートの所有者・キャラ整合性も検証する。
export async function upsertFocusIssue(userId: string, input: unknown): Promise<FocusIssueResponse> {
  const payload = validateFocusIssuePayload(input);
  const uniqueReferenceNoteIds = Array.from(new Set(payload.referenceNoteIds));
  const referenceNotes = await Promise.all(uniqueReferenceNoteIds.map((noteId) => getNote(userId, noteId)));

  referenceNotes.forEach((note) => {
    if (!note || note.character !== payload.character) {
      throw new Error("参考ノートには同一キャラの自分のノートのみ指定できます。");
    }
  });

  const existing = await getFocusIssue(userId, payload.character);
  const now = new Date().toISOString();
  const issue: FocusIssue = {
    issueId: buildFocusIssueKey(payload.character),
    userId,
    character: payload.character,
    title: payload.title,
    memo: payload.memo,
    referenceNoteIds: uniqueReferenceNoteIds,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  const savedIssue = await putFocusIssue(issue);
  return toFocusIssueResponse(savedIssue);
}
