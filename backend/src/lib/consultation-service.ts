import OpenAI from "openai";
import { buildNoteTitle, type AiConsultationRequest, type AiConsultationResponse, type Note } from "@shared/types";
import { getRequiredEnv } from "./env";
import { listNotesByCharacter } from "./repository";
import { validateConsultationPayload } from "./validators";

type ScoredNote = {
  note: Note;
  score: number;
};

type ConsultationDebugNote = {
  noteId: string;
  noteType: Note["noteType"];
  title: string;
  tags: string[];
  updatedAt: string;
};

const OPENAI_API_KEY_CONFIGURATION_MESSAGE =
  "OpenAI APIキーが設定されていません。管理者はLambda環境変数 OPENAI_API_KEY を確認してください。";

// CloudWatch Logs で相談ごとの抽出状況を追えるよう、本文を含めずに最小限のメタ情報だけへ丸める。
function summarizeNoteForDebug(note: Note): ConsultationDebugNote {
  return {
    noteId: note.noteId,
    noteType: note.noteType,
    title: buildNoteTitle(note),
    tags: note.tags,
    updatedAt: note.updatedAt
  };
}

// 相談文やノート本文を簡易トークンへ分解し、関連度計算に使える形へ揃える。
function tokenize(text: string): string[] {
  return (text.match(/[A-Za-z0-9\u3040-\u30ff\u4e00-\u9faf._-]+/g) ?? []).map((token) => token.toLowerCase());
}

// 相談条件に近いノートだけをスコアリングして抽出し、AI に渡す参照ノートを絞り込む。
function scoreNotes(request: AiConsultationRequest, notes: Note[]): Note[] {
  const requestKeywords = tokenize(request.consultationText);

  // 相談内容に近いノートを最大5件だけ選び、AIに渡す情報量を絞る。
  const scoredNotes: ScoredNote[] = notes
    .filter((note) => {
      const typeMatch = !request.noteTypes || request.noteTypes.length === 0 || request.noteTypes.includes(note.noteType);
      return note.character === request.character && typeMatch;
    })
    .map((note) => {
      let score = 1;
      if ("opponentCharacter" in note && request.opponentCharacter && note.opponentCharacter === request.opponentCharacter) {
        score += 3;
      }

      if (request.tags && request.tags.length > 0) {
        const overlap = note.tags.filter((tag) => request.tags?.includes(tag)).length;
        score += overlap * 2;
      }

      const body =
        note.noteType === "battleRecord"
          ? `${note.opponentCharacter} ${note.result} ${note.goodPoints} ${note.improvements}`
          : note.noteType === "videoSummary"
            ? `${note.videoTitle} ${note.summary}`
            : `${note.title} ${note.memo}`;
      const noteTokens = new Set(tokenize(body));
      const keywordMatches = requestKeywords.filter((keyword) => noteTokens.has(keyword)).length;
      score += keywordMatches;

      return { note, score };
    });

  return scoredNotes
    .sort((left, right) => right.score - left.score || right.note.updatedAt.localeCompare(left.note.updatedAt))
    .slice(0, 5)
    .map((entry) => entry.note);
}

// 選ばれたノート群を AI へ渡すためのプロンプト文字列へ整形する。
function buildPrompt(request: AiConsultationRequest, notes: Note[]): string {
  // AIが参照しやすいように、ノート種別ごとに必要な項目だけをテキスト化する。
  const references = notes.map((note, index) => {
    if (note.noteType === "battleRecord") {
      return `Reference ${index + 1}
title: ${buildNoteTitle(note)}
type: battleRecord
opponentCharacter: ${note.opponentCharacter}
result: ${note.result}
goodPoints: ${note.goodPoints}
improvements: ${note.improvements}
tags: ${note.tags.join(", ")}`;
    }

    if (note.noteType === "general") {
      return `Reference ${index + 1}
title: ${buildNoteTitle(note)}
type: general
memo: ${note.memo}
tags: ${note.tags.join(", ")}`;
    }

    return `Reference ${index + 1}
title: ${buildNoteTitle(note)}
type: videoSummary
videoTitle: ${note.videoTitle}
summary: ${note.summary}
tags: ${note.tags.join(", ")}`;
  });

  return `あなたはSF6の絶対知識を断定するコーチではなく、渡されたノートを整理して助言するアシスタントです。
ノートに書かれていないことを強く断定せず、曖昧な点は弱い表現にしてください。
次のJSON形式だけを返してください。各配列は1件以上、3件以下にしてください。
{
  "summary": "相談内容と参照ノートから整理した要約",
  "improvements": ["改善ポイント"],
  "nextActions": ["次の対戦で試す具体的な行動"],
  "referenceNotes": ["根拠にした参照ノートのtitle"]
}

相談内容:
- character: ${request.character}
- opponentCharacter: ${request.opponentCharacter ?? ""}
- tags: ${(request.tags ?? []).join(", ")}
- consultationText: ${request.consultationText}

参照ノート:
${references.join("\n\n")}`;
}

// OpenAI から返った JSON をアプリの相談レスポンス型へ変換し、不完全な結果を弾く。
function parseJsonResult(content: string): AiConsultationResponse {
  const parsed = JSON.parse(content) as AiConsultationResponse;

  // OpenAIの返答を画面表示用の型へ寄せる。型が違う値はここで空値に丸める。
  const result = {
    summary: parsed.summary ?? "",
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
    referenceNotes: Array.isArray(parsed.referenceNotes) ? parsed.referenceNotes : []
  };

  // 空の結果を正常扱いすると画面に何も出ないため、フォールバックへ切り替える。
  if (!result.summary.trim() || result.improvements.length === 0 || result.nextActions.length === 0) {
    throw new Error("OpenAI response did not match the expected consultation schema.");
  }

  return result;
}

// デプロイ用のダミー値や未設定値はfallbackで隠さず、画面へ設定不備として返す。
function getConfiguredOpenAiApiKey(): string {
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  if (apiKey.startsWith("dummy-")) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return apiKey;
}

// APIキー不備は利用者が同じfallback回答を見続ける原因になるため、OpenAIの通常失敗と分けて扱う。
function isOpenAiConfigurationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error !== null && "status" in error ? (error as { status?: unknown }).status : undefined;

  return (
    message.includes("OPENAI_API_KEY is required") ||
    message.includes("OPENAI_API_KEY is not configured") ||
    message.includes("Incorrect API key") ||
    status === 401
  );
}

// OpenAI API を呼び出し、ノート根拠付きの相談結果を JSON スキーマで受け取る。
async function askOpenAI(request: AiConsultationRequest, notes: Note[]): Promise<AiConsultationResponse> {
  const client = new OpenAI({
    apiKey: getConfiguredOpenAiApiKey()
  });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    // 期待するJSON構造をOpenAI側で強制し、キー名のズレによる空表示を防ぐ。
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ai_consultation_response",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            improvements: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "string" }
            },
            nextActions: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "string" }
            },
            referenceNotes: {
              type: "array",
              minItems: 1,
              maxItems: 5,
              items: { type: "string" }
            }
          },
          required: ["summary", "improvements", "nextActions", "referenceNotes"]
        }
      }
    },
    messages: [
      {
        role: "system",
        content:
          "You organize fighting game improvement notes. Respond with JSON only. Use the note evidence. Avoid unsupported claims."
      },
      {
        role: "user",
        content: buildPrompt(request, notes)
      }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response was empty.");
  }

  return parseJsonResult(content);
}

// OpenAI 側で失敗した場合でも、参照ノートだけから最低限の相談結果を組み立てて返す。
function fallbackConsultation(notes: Note[]): AiConsultationResponse {
  // OpenAI呼び出しやJSON解析に失敗しても、参照ノートから最低限の結果を返す。
  return {
    summary: "参照ノートから、同条件で繰り返し発生している課題を整理しました。",
    improvements: notes.slice(0, 3).map((note) => `「${buildNoteTitle(note)}」の内容を見直し、再現しやすい改善点を一つに絞る。`),
    nextActions: ["対戦前に1つだけ意識ポイントを決める。", "対戦後に改善点を1行で追記する。"],
    referenceNotes: notes.map((note) => buildNoteTitle(note))
  };
}

// 入力検証、参照ノート抽出、OpenAI 呼び出し、フォールバックまでをまとめて実行する。
export async function consultWithNotes(userId: string, input: unknown): Promise<AiConsultationResponse> {
  const request = validateConsultationPayload(input);
  const notes = await listNotesByCharacter(userId, request.character);
  const selectedNotes = scoreNotes(request, notes);

  console.log("AI consultation note selection", {
    userId,
    character: request.character,
    opponentCharacter: request.opponentCharacter ?? null,
    tags: request.tags ?? [],
    noteTypes: request.noteTypes ?? [],
    consultationTextLength: request.consultationText.length,
    totalNotes: notes.length,
    selectedNotes: selectedNotes.map(summarizeNoteForDebug)
  });

  // 参照ノートがない場合はAIに聞かず、まずノート追加を促す。
  if (selectedNotes.length === 0) {
    console.log("AI consultation skipped OpenAI because no reference notes were selected", {
      userId,
      character: request.character
    });
    return {
      summary: "条件に合う参考ノートが見つからなかったため、まずは同条件の対戦記録を増やすと整理しやすくなります。",
      improvements: ["相手キャラや課題タグを付けてノートを追加する。"],
      nextActions: ["直近の対戦を1件記録する。"],
      referenceNotes: []
    };
  }

  try {
    const response = await askOpenAI(request, selectedNotes);
    console.log("AI consultation OpenAI succeeded", {
      userId,
      character: request.character,
      selectedNoteCount: selectedNotes.length,
      referenceNotes: response.referenceNotes
    });
    return {
      ...response,
      // AIが参考ノート名を返さなかった場合は、実際に渡したノート名で補完する。
      referenceNotes:
        response.referenceNotes.length > 0 ? response.referenceNotes : selectedNotes.map((note) => buildNoteTitle(note))
    };
  } catch (error) {
    if (isOpenAiConfigurationError(error)) {
      console.error("AI consultation OpenAI configuration error", {
        userId,
        character: request.character,
        selectedNoteCount: selectedNotes.length,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw new Error(OPENAI_API_KEY_CONFIGURATION_MESSAGE);
    }

    console.error("AI consultation OpenAI failed. Falling back.", {
      userId,
      character: request.character,
      selectedNoteCount: selectedNotes.length,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return fallbackConsultation(selectedNotes);
  }
}
