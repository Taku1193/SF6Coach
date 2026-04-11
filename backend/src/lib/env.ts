// 必須環境変数を取得し、未設定時は明示的にエラーにする。
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

// MVP 用の固定 userId を返し、未設定時は local-user へフォールバックする。
export function getAppUserId(): string {
  // MVP では固定ユーザー前提のため、未設定時も local-user にフォールバックする。
  return process.env.APP_USER_ID ?? "local-user";
}
