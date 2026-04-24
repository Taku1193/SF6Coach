export const NOTE_TYPES = ["battleRecord", "videoSummary", "general"] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

// すべてのノートに共通するメタ情報。
export type BaseNote = {
  noteId: string;
  userId: string;
  character: string;
  noteType: NoteType;
  isFavorite: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type BattleRecordNote = BaseNote & {
  noteType: "battleRecord";
  opponentCharacter: string;
  result: string;
  goodPoints: string;
  improvements: string;
};

export type VideoSummaryNote = BaseNote & {
  noteType: "videoSummary";
  videoTitle: string;
  url: string;
  summary: string;
};

export type GeneralNote = BaseNote & {
  noteType: "general";
  title: string;
  memo: string;
};

export type Note = BattleRecordNote | VideoSummaryNote | GeneralNote;

// 作成時 payload はフロントから送る業務入力だけを持ち、noteId などは backend が補完する。
export type CreateBattleRecordPayload = {
  character: string;
  opponentCharacter: string;
  result: string;
  goodPoints: string;
  improvements: string;
  tags: string[];
};

export type CreateVideoSummaryPayload = {
  character: string;
  videoTitle: string;
  url: string;
  summary: string;
  tags: string[];
};

export type CreateGeneralNotePayload = {
  character: string;
  title: string;
  memo: string;
  tags: string[];
};

export type UpdateNotePayload = Partial<
  Pick<
    BattleRecordNote,
    "character" | "opponentCharacter" | "result" | "goodPoints" | "improvements" | "tags"
  > &
    Pick<VideoSummaryNote, "videoTitle" | "url" | "summary"> &
    Pick<GeneralNote, "title" | "memo">
>;

export type UpdateFavoritePayload = {
  isFavorite: boolean;
};

export type NotesResponse = {
  notes: Note[];
};

export type AiConsultationRequest = {
  character: string;
  opponentCharacter?: string;
  consultationText: string;
  tags?: string[];
  noteTypes?: NoteType[];
};

export type AiConsultationResponse = {
  summary: string;
  improvements: string[];
  nextActions: string[];
  referenceNotes: string[];
};

export type FocusIssue = {
  issueId: string;
  userId: string;
  character: string;
  title: string;
  memo: string;
  referenceNoteIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type FocusIssueReferenceNote = {
  noteId: string;
  noteType: NoteType;
  title: string;
  updatedAt: string;
};

export type FocusIssueView = Omit<FocusIssue, "userId" | "referenceNoteIds"> & {
  referenceNotes: FocusIssueReferenceNote[];
};

export type FocusIssueResponse = {
  issue: FocusIssueView | null;
};

export type UpsertFocusIssuePayload = {
  character: string;
  title: string;
  memo: string;
  referenceNoteIds: string[];
};

export type CharacterOption = {
  id: string;
  name: string;
  released: boolean;
};

// Note が battleRecord かどうかを判定し、分岐後に型を絞り込めるようにする。
export function isBattleRecordNote(note: Note): note is BattleRecordNote {
  // 画面側で noteType ごとに表示項目を切り替えるための type guard。
  return note.noteType === "battleRecord";
}

// Note が videoSummary かどうかを判定し、分岐後に型を絞り込めるようにする。
export function isVideoSummaryNote(note: Note): note is VideoSummaryNote {
  return note.noteType === "videoSummary";
}

// Note が general かどうかを判定し、メモ系ノートの表示と編集を安全に切り替える。
export function isGeneralNote(note: Note): note is GeneralNote {
  return note.noteType === "general";
}

// ノート種別表示の文言はこの関数に寄せ、画面ごとの表記ブレを防ぐ。
export function getNoteTypeLabel(noteType: NoteType): string {
  if (noteType === "battleRecord") {
    return "対戦記録";
  }

  if (noteType === "videoSummary") {
    return "動画要約";
  }

  return "その他ノート";
}

// ノート種別に応じて、一覧や詳細で使う見出し文字列を組み立てる。
export function buildNoteTitle(note: Note): string {
  // 一覧や詳細の見出しはこの関数に寄せ、表示ルールを散らさない。
  if (note.noteType === "battleRecord") {
    return `${note.opponentCharacter}戦 ${note.result}`;
  }

  if (note.noteType === "videoSummary") {
    return note.videoTitle;
  }

  return note.title;
}
