import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { createBattleRecordNote, createVideoSummaryNote, deleteNoteById, getNoteById, listNotes, updateNoteById } from "../lib/notes-service";
import { consultWithNotes } from "../lib/consultation-service";
import { badRequest, created, noContent, notFound, ok, serverError } from "../lib/responses";

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const routeKey = `${event.requestContext.http.method} ${event.rawPath}`;
    const noteId = event.pathParameters?.noteId;

    if (event.requestContext.http.method === "OPTIONS") {
      return ok({});
    }

    if (routeKey === "GET /notes") {
      const character = event.queryStringParameters?.character;
      if (!character) {
        return badRequest("character は必須です。");
      }

      const notes = await listNotes(character);
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

function parseBody(body: string | undefined): unknown {
  if (!body) {
    return {};
  }

  return JSON.parse(body);
}
