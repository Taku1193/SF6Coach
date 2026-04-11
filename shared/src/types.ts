export const NOTE_TYPES = ["battleRecord", "videoSummary"] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

// すべてのノートに共通するメタ情報。
export type BaseNote = {
  noteId: string;
  userId: string;
  character: string;
  noteType: NoteType;
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

export type Note = BattleRecordNote | VideoSummaryNote;

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

export type UpdateNotePayload = Partial<
  Pick<
    BattleRecordNote,
    "character" | "opponentCharacter" | "result" | "goodPoints" | "improvements" | "tags"
  > &
    Pick<VideoSummaryNote, "videoTitle" | "url" | "summary">
>;

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

export type CharacterOption = {
  id: string;
  name: string;
  released: boolean;
};

export function isBattleRecordNote(note: Note): note is BattleRecordNote {
  // 画面側で noteType ごとに表示項目を切り替えるための type guard。
  return note.noteType === "battleRecord";
}

export function buildNoteTitle(note: Note): string {
  // 一覧や詳細の見出しはこの関数に寄せ、表示ルールを散らさない。
  if (note.noteType === "battleRecord") {
    return `${note.opponentCharacter}戦 ${note.result}`;
  }

  return note.videoTitle;
}
