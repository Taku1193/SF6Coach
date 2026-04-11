import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
};

function response(statusCode: number, body?: unknown): APIGatewayProxyStructuredResultV2 {
  // Lambda の返却形式をここで統一し、各 handler は status/body だけ意識すればよいようにする。
  return {
    statusCode,
    headers: defaultHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

export function ok(body: unknown) {
  return response(200, body);
}

export function created(body: unknown) {
  return response(201, body);
}

export function noContent() {
  return response(204);
}

export function badRequest(message: string) {
  return response(400, { message });
}

export function notFound(message: string) {
  return response(404, { message });
}

export function serverError(message: string) {
  return response(500, { message });
}
