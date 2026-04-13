import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS"
};

// Lambda のレスポンス形式を共通化し、status・headers・body を毎回同じ形で返す。
function response(statusCode: number, body?: unknown): APIGatewayProxyStructuredResultV2 {
  // Lambda の返却形式をここで統一し、各 handler は status/body だけ意識すればよいようにする。
  return {
    statusCode,
    headers: defaultHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

// 200 OK の JSON レスポンスを返す。
export function ok(body: unknown) {
  return response(200, body);
}

// 201 Created の JSON レスポンスを返す。
export function created(body: unknown) {
  return response(201, body);
}

// 204 No Content を返し、本文を持たない成功系レスポンスを表す。
export function noContent() {
  return response(204);
}

// 400 Bad Request を返し、入力不正などの利用者起因エラーを伝える。
export function badRequest(message: string) {
  return response(400, { message });
}

// 404 Not Found を返し、対象リソースが存在しないことを伝える。
export function notFound(message: string) {
  return response(404, { message });
}

// 500 Internal Server Error を返し、想定外のサーバー側失敗を伝える。
export function serverError(message: string) {
  return response(500, { message });
}
