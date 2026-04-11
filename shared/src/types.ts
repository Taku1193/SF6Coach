export const NOTE_TYPES = ["battleRecord", "videoSummary"] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

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
  return note.noteType === "battleRecord";
}

export function buildNoteTitle(note: Note): string {
  if (note.noteType === "battleRecord") {
    return `${note.opponentCharacter}戦 ${note.result}`;
  }

  return note.videoTitle;
}
