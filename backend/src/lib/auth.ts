import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

// API Gateway の JWT authorizer が埋めた claims から、安全に文字列 claim を取り出す。
function readStringClaim(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "";
}

// 認証済みリクエストから Cognito の sub を取得し、ユーザー分離の主キーとして使う。
export function getAuthenticatedUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const cognitoUserId = readStringClaim(event.requestContext.authorizer?.jwt?.claims?.sub);
  if (cognitoUserId) {
    return cognitoUserId;
  }

  // sam local では JWT authorizer の claims が入らないため、検証用ヘッダーだけをローカル限定で許可する。
  if (process.env.AWS_SAM_LOCAL === "true") {
    return readStringClaim(event.headers?.["x-test-user-id"]) || "local-user";
  }

  return "";
}
