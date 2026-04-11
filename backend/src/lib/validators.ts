import type { AiConsultationRequest, CreateBattleRecordPayload, CreateVideoSummaryPayload, UpdateNotePayload } from "@shared/types";

// 指定値が文字列であることを確認し、前後空白を除いた文字列を返す。
function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} は文字列で指定してください。`);
  }

  // 入力段階で trim しておくと、以降の必須判定や保存時のゆれを減らせる。
  return value.trim();
}

// タグ入力を string 配列へ正規化し、非文字列や空文字を取り除く。
function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// 対戦記録ノート作成時の入力を検証し、保存可能な payload へ整形する。
export function validateCreateBattleRecordPayload(input: unknown): CreateBattleRecordPayload {
  if (!input || typeof input !== "object") {
    throw new Error("対戦記録ノートの入力が不正です。");
  }

  const payload = input as Record<string, unknown>;
  const character = assertString(payload.character, "character");
  const opponentCharacter = assertString(payload.opponentCharacter, "opponentCharacter");
  const result = assertString(payload.result, "result");
  const goodPoints = typeof payload.goodPoints === "string" ? payload.goodPoints.trim() : "";
  const improvements = typeof payload.improvements === "string" ? payload.improvements.trim() : "";

  if (!opponentCharacter) {
    throw new Error("opponentCharacter は必須です。");
  }

  if (!result) {
    throw new Error("result は必須です。");
  }

  return {
    character,
    opponentCharacter,
    result,
    goodPoints,
    improvements,
    tags: normalizeTags(payload.tags)
  };
}

// 動画要約ノート作成時の入力を検証し、保存可能な payload へ整形する。
export function validateCreateVideoSummaryPayload(input: unknown): CreateVideoSummaryPayload {
  if (!input || typeof input !== "object") {
    throw new Error("動画要約ノートの入力が不正です。");
  }

  const payload = input as Record<string, unknown>;
  const character = assertString(payload.character, "character");
  const videoTitle = assertString(payload.videoTitle, "videoTitle");
  const summary = assertString(payload.summary, "summary");
  const url = typeof payload.url === "string" ? payload.url.trim() : "";

  if (!videoTitle) {
    throw new Error("videoTitle は必須です。");
  }

  if (!summary) {
    throw new Error("summary は必須です。");
  }

  return {
    character,
    videoTitle,
    url,
    summary,
    tags: normalizeTags(payload.tags)
  };
}

// 更新 API の入力を partial payload として整形し、未指定項目は undefined で返す。
export function validateUpdatePayload(input: unknown): UpdateNotePayload {
  if (!input || typeof input !== "object") {
    throw new Error("更新データが不正です。");
  }

  const payload = input as Record<string, unknown>;
  // 更新 API は partial update 前提なので、未指定項目は undefined のまま返す。
  return {
    character: typeof payload.character === "string" ? payload.character.trim() : undefined,
    opponentCharacter: typeof payload.opponentCharacter === "string" ? payload.opponentCharacter.trim() : undefined,
    result: typeof payload.result === "string" ? payload.result.trim() : undefined,
    goodPoints: typeof payload.goodPoints === "string" ? payload.goodPoints.trim() : undefined,
    improvements: typeof payload.improvements === "string" ? payload.improvements.trim() : undefined,
    videoTitle: typeof payload.videoTitle === "string" ? payload.videoTitle.trim() : undefined,
    url: typeof payload.url === "string" ? payload.url.trim() : undefined,
    summary: typeof payload.summary === "string" ? payload.summary.trim() : undefined,
    tags: payload.tags === undefined ? undefined : normalizeTags(payload.tags)
  };
}

// AI 相談の入力を検証し、使用可能な noteTypes だけを残して返す。
export function validateConsultationPayload(input: unknown): AiConsultationRequest {
  if (!input || typeof input !== "object") {
    throw new Error("AI相談の入力が不正です。");
  }

  const payload = input as Record<string, unknown>;
  const character = assertString(payload.character, "character");
  const consultationText = assertString(payload.consultationText, "consultationText");

  if (!character) {
    throw new Error("character は必須です。");
  }

  if (!consultationText) {
    throw new Error("consultationText は必須です。");
  }

  return {
    character,
    opponentCharacter: typeof payload.opponentCharacter === "string" ? payload.opponentCharacter.trim() : undefined,
    consultationText,
    tags: normalizeTags(payload.tags),
    // noteTypes は許可した値だけを通し、不正な文字列は黙って捨てる。
    noteTypes: Array.isArray(payload.noteTypes)
      ? payload.noteTypes.filter((value): value is "battleRecord" | "videoSummary" => value === "battleRecord" || value === "videoSummary")
      : undefined
  };
}
