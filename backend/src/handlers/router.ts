import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { createBattleRecordNote, createVideoSummaryNote, deleteNoteById, getNoteById, listNotes, updateNoteById, updateNoteFavoriteById } from "../lib/notes-service";
import { consultWithNotes } from "../lib/consultation-service";
import { badRequest, created, noContent, notFound, ok, serverError } from "../lib/responses";

// 受け取った HTTP リクエストを各サービス処理へ振り分け、統一レスポンスで返す。
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // SAM の HttpApi では routeKey だけでは拾いづらいケースがあるため、
    // method と rawPath の組み合わせで分岐する。
    const routeKey = `${event.requestContext.http.method} ${event.rawPath}`;
    const noteId = event.pathParameters?.noteId;

    if (event.requestContext.http.method === "OPTIONS") {
      return ok({});
    }

    if (routeKey === "GET /notes") {
      const character = event.queryStringParameters?.character;
      const favoriteOnly = event.queryStringParameters?.favoriteOnly === "true";
      if (!character) {
        return badRequest("character は必須です。");
      }

      const notes = await listNotes(character, favoriteOnly);
      return ok({ notes });
    }

    if (event.requestContext.http.method === "GET" && noteId && event.rawPath.startsWith("/notes/")) {
      const note = await getNoteById(noteId);
      if (!note) {
        return notFound("ノートが見つかりません。");
      }

      return ok({ note });
    }

    if (routeKey === "POST /notes/battle-record") {
      const payload = parseBody(event.body);
      const note = await createBattleRecordNote(payload);
      return created({ note });
    }

    if (routeKey === "POST /notes/video-summary") {
      const payload = parseBody(event.body);
      const note = await createVideoSummaryNote(payload);
      return created({ note });
    }

    if (event.requestContext.http.method === "PUT" && noteId && event.rawPath.startsWith("/notes/")) {
      const payload = parseBody(event.body);
      const note = await updateNoteById(noteId, payload);
      if (!note) {
        return notFound("ノートが見つかりません。");
      }

      return ok({ note });
    }

    if (event.requestContext.http.method === "PATCH" && noteId && event.rawPath === `/notes/${noteId}/favorite`) {
      const payload = parseBody(event.body);
      const note = await updateNoteFavoriteById(noteId, payload);
      if (!note) {
        return notFound("ノートが見つかりません。");
      }

      return ok({ note });
    }

    if (event.requestContext.http.method === "DELETE" && noteId && event.rawPath.startsWith("/notes/")) {
      const deleted = await deleteNoteById(noteId);
      if (!deleted) {
        return notFound("ノートが見つかりません。");
      }

      return noContent();
    }

    if (routeKey === "POST /ai-consultation") {
      const payload = parseBody(event.body);
      const response = await consultWithNotes(payload);
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
