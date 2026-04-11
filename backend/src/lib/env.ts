export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getAppUserId(): string {
  // MVP では固定ユーザー前提のため、未設定時も local-user にフォールバックする。
  return process.env.APP_USER_ID ?? "local-user";
}
