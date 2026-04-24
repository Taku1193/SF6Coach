import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getRequiredEnv } from "./env";
import type { FocusIssue, Note } from "@shared/types";

type StoredNote = Note & {
  gsi1pk: string;
  gsi1sk: string;
};

type StoredFocusIssue = FocusIssue & {
  noteId: string;
};

// 旧データには isFavorite が存在しないため、読込時に false を補完して互換性を保つ。
function normalizeNote(raw: Note | (Partial<Note> & { [key: string]: unknown })): Note {
  return {
    ...(raw as Note),
    isFavorite: raw.isFavorite === true
  };
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = () => getRequiredEnv("NOTES_TABLE_NAME");

// アプリ内ノートを DynamoDB 保存形式へ変換し、一覧用 GSI キーも補完する。
function toStoredNote(note: Note): StoredNote {
  // 一覧取得はキャラ単位で行うため、GSI には userId#character をまとめて持たせる。
  return {
    ...note,
    gsi1pk: `${note.userId}#${note.character}`,
    gsi1sk: note.updatedAt
  };
}

// キャラ単位の GSI を使ってノート一覧を取得し、更新日時の降順で返す。
export async function listNotesByCharacter(userId: string, character: string): Promise<Note[]> {
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
  // Query の結果順は GSI の sort key 依存だが、念のため updatedAt 降順で整えて返す。
  return (result.Items ?? [])
    .map((item) => normalizeNote(item as Note))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

// 主キー userId + noteId でノートを 1 件取得し、存在しない場合は null を返す。
export async function getNote(userId: string, noteId: string): Promise<Note | null> {
  const command = new GetCommand({
    TableName: tableName(),
    Key: {
      userId,
      noteId
    }
  });

  const result = await client.send(command);
  return result.Item ? normalizeNote(result.Item as Note) : null;
}

// ノート 1 件をそのまま Put し、新規作成用の永続化処理として使う。
export async function putNote(note: Note): Promise<Note> {
  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: toStoredNote(note)
    })
  );

  return note;
}

// 既存ノートを UpdateExpression で上書きし、GSI 用の派生属性も含めて同期させる。
export async function updatePersistedNote(note: Note): Promise<Note> {
  const stored = toStoredNote(note);
  await client.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: {
        userId: stored.userId,
        noteId: stored.noteId
      },
      // UpdateExpression の左辺に予約語が含まれても壊れないよう、属性名はすべてエイリアス化する。
      UpdateExpression:
        "SET #character = :character, #noteType = :noteType, #isFavorite = :isFavorite, #tags = :tags, #createdAt = :createdAt, #updatedAt = :updatedAt, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk, #opponentCharacter = :opponentCharacter, #result = :result, #goodPoints = :goodPoints, #improvements = :improvements, #videoTitle = :videoTitle, #url = :url, #summary = :summary, #title = :title, #memo = :memo",
      ExpressionAttributeNames: {
        "#character": "character",
        "#noteType": "noteType",
        "#isFavorite": "isFavorite",
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
        "#summary": "summary",
        "#title": "title",
        "#memo": "memo"
      },
      ExpressionAttributeValues: {
        ":character": stored.character,
        ":noteType": stored.noteType,
        ":isFavorite": stored.isFavorite,
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
        ":summary": "summary" in stored ? stored.summary : null,
        ":title": "title" in stored ? stored.title : null,
        ":memo": "memo" in stored ? stored.memo : null
      }
    })
  );

  return note;
}

// ノート削除前に存在確認を行い、API で 404 判定できるよう boolean を返す。
export async function removeNote(userId: string, noteId: string): Promise<boolean> {
  const existing = await getNote(userId, noteId);
  if (!existing) {
    return false;
  }

  // 先に存在確認しておくことで、削除結果を API では 404 として返せる。
  await client.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: {
        userId,
        noteId
      }
    })
  );

  return true;
}

// 課題はキャラごとに1件だけ持つため、DynamoDB の sort key を固定値にして upsert できるようにする。
export function buildFocusIssueKey(character: string): string {
  return `focusIssue#${character}`;
}

// userId + focusIssue#character で、選択中キャラの現在課題を1件取得する。
export async function getFocusIssue(userId: string, character: string): Promise<FocusIssue | null> {
  const command = new GetCommand({
    TableName: tableName(),
    Key: {
      userId,
      noteId: buildFocusIssueKey(character)
    }
  });

  const result = await client.send(command);
  if (!result.Item) {
    return null;
  }

  const item = result.Item as StoredFocusIssue;
  return {
    issueId: item.issueId,
    userId: item.userId,
    character: item.character,
    title: item.title,
    memo: item.memo ?? "",
    referenceNoteIds: Array.isArray(item.referenceNoteIds) ? item.referenceNoteIds : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

// 課題はノート一覧用 GSI に載せず、通常ノート一覧へ混ざらない単独アイテムとして保存する。
export async function putFocusIssue(issue: FocusIssue): Promise<FocusIssue> {
  const stored: StoredFocusIssue = {
    ...issue,
    noteId: issue.issueId
  };

  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: stored
    })
  );

  return issue;
}
