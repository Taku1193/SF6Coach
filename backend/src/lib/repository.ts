import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getAppUserId, getRequiredEnv } from "./env";
import type { Note } from "@shared/types";

type StoredNote = Note & {
  gsi1pk: string;
  gsi1sk: string;
};

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = () => getRequiredEnv("NOTES_TABLE_NAME");

function toStoredNote(note: Note): StoredNote {
  return {
    ...note,
    gsi1pk: `${note.userId}#${note.character}`,
    gsi1sk: note.updatedAt
  };
}

export async function listNotesByCharacter(character: string): Promise<Note[]> {
  const userId = getAppUserId();
  const command = new QueryCommand({
    TableName: tableName(),
    IndexName: "GSI1",
    KeyConditionExpression: "gsi1pk = :gsi1pk",
    ExpressionAttributeValues: {
      ":gsi1pk": `${userId}#${character}`
    },
    ScanIndexForward: false
  });

  const result = await client.send(command);
  return ((result.Items ?? []) as Note[]).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getNote(noteId: string): Promise<Note | null> {
  const command = new GetCommand({
    TableName: tableName(),
    Key: {
      userId: getAppUserId(),
      noteId
    }
  });

  const result = await client.send(command);
  return (result.Item as Note | undefined) ?? null;
}

export async function putNote(note: Note): Promise<Note> {
  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: toStoredNote(note)
    })
  );

  return note;
}

export async function updatePersistedNote(note: Note): Promise<Note> {
  const stored = toStoredNote(note);
  await client.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: {
        userId: stored.userId,
        noteId: stored.noteId
      },
      UpdateExpression:
        "SET #character = :character, #noteType = :noteType, #tags = :tags, #createdAt = :createdAt, #updatedAt = :updatedAt, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk, #opponentCharacter = :opponentCharacter, #result = :result, #goodPoints = :goodPoints, #improvements = :improvements, #videoTitle = :videoTitle, #url = :url, #summary = :summary",
      ExpressionAttributeNames: {
        "#character": "character",
        "#noteType": "noteType",
        "#tags": "tags",
        "#createdAt": "createdAt",
        "#updatedAt": "updatedAt",
        "#gsi1pk": "gsi1pk",
        "#gsi1sk": "gsi1sk",
        "#opponentCharacter": "opponentCharacter",
        "#result": "result",
        "#goodPoints": "goodPoints",
        "#improvements": "improvements",
        "#videoTitle": "videoTitle",
        "#url": "url",
        "#summary": "summary"
      },
      ExpressionAttributeValues: {
        ":character": stored.character,
        ":noteType": stored.noteType,
        ":tags": stored.tags,
        ":createdAt": stored.createdAt,
        ":updatedAt": stored.updatedAt,
        ":gsi1pk": stored.gsi1pk,
        ":gsi1sk": stored.gsi1sk,
        ":opponentCharacter": "opponentCharacter" in stored ? stored.opponentCharacter : null,
        ":result": "result" in stored ? stored.result : null,
        ":goodPoints": "goodPoints" in stored ? stored.goodPoints : null,
        ":improvements": "improvements" in stored ? stored.improvements : null,
        ":videoTitle": "videoTitle" in stored ? stored.videoTitle : null,
        ":url": "url" in stored ? stored.url : null,
        ":summary": "summary" in stored ? stored.summary : null
      }
    })
  );

  return note;
}

export async function removeNote(noteId: string): Promise<boolean> {
  const existing = await getNote(noteId);
  if (!existing) {
    return false;
  }

  await client.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: {
        userId: getAppUserId(),
        noteId
      }
    })
  );

  return true;
}
