import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { createBattleRecordNote, createVideoSummaryNote, deleteNoteById, getNoteById, listNotes, updateNoteById, updateNoteFavoriteById } from "../lib/notes-service";
import { consultWithNotes } from "../lib/consultation-service";
import { badRequest, created, noContent, notFound, ok, serverError, unauthorized } from "../lib/responses";
import { getAuthenticatedUserId } from "../lib/auth";

// 受け取った HTTP リクエストを各サービス処理へ振り分け、統一レスポンスで返す。
export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // SAM の HttpApi では routeKey だけでは拾いづらいケースがあるため、
    // method と rawPath の組み合わせで分岐する。
    const routeKey = `${event.requestContext.http.method} ${event.rawPath}`;
    const noteId = event.pathParameters?.noteId;

    if (event.requestContext.http.method === "OPTIONS") {
      return ok({});
    }

    // API Gateway 側でも JWT を検証するが、ローカル実行や設定漏れ時に備えて Lambda 側でも userId の存在を確認する。
    const userId = getAuthenticatedUserId(event);
    if (!userId) {
      return unauthorized("認証が必要です。再度ログインしてください。");
    }

    if (routeKey === "GET /notes") {
      const character = event.queryStringParameters?.character;
      const favoriteOnly = event.queryStringParameters?.favoriteOnly === "true";
      if (!character) {
        return badRequest("character は必須です。");
      }

      const notes = await listNotes(userId, character, favoriteOnly);
      return ok({ notes });
    }

    if (event.requestContext.http.method === "GET" && noteId && event.rawPath.startsWith("/notes/")) {
      const note = await getNoteById(userId, noteId);
      if (!note) {
        return notFound("ノートが見つかりません。");
      }

      return ok({ note });
    }

    if (routeKey === "POST /notes/battle-record") {
      const payload = parseBody(event.body);
      const note = await createBattleRecordNote(userId, payload);
      return created({ note });
    }

    if (routeKey === "POST /notes/video-summary") {
      const payload = parseBody(event.body);
      const note = await createVideoSummaryNote(userId, payload);
      return created({ note });
    }

    if (event.requestContext.http.method === "PUT" && noteId && event.rawPath.startsWith("/notes/")) {
      const payload = parseBody(event.body);
      const note = await updateNoteById(userId, noteId, payload);
      if (!note) {
        return notFound("ノートが見つかりません。");
      }

      return ok({ note });
    }

    if (event.requestContext.http.method === "PATCH" && noteId && event.rawPath === `/notes/${noteId}/favorite`) {
      const payload = parseBody(event.body);
      const note = await updateNoteFavoriteById(userId, noteId, payload);
      if (!note) {
        return notFound("ノートが見つかりません。");
      }

      return ok({ note });
    }

    if (event.requestContext.http.method === "DELETE" && noteId && event.rawPath.startsWith("/notes/")) {
      const deleted = await deleteNoteById(userId, noteId);
      if (!deleted) {
        return notFound("ノートが見つかりません。");
      }

      return noContent();
    }

    if (routeKey === "POST /ai-consultation") {
      const payload = parseBody(event.body);
      const response = await consultWithNotes(userId, payload);
      return ok(response);
    }

    return notFound("該当するエンドポイントがありません。");
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Unexpected server error.");
  }
}

// API Gateway から渡された JSON body を object へ変換し、未指定時は空 object を返す。
function parseBody(body: string | undefined): unknown {
  if (!body) {
    // body がないリクエストも一律で object 扱いに寄せ、各 validator 側で必須判定する。
    return {};
  }

  return JSON.parse(body);
}
