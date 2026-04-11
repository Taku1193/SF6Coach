export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getAppUserId(): string {
  return process.env.APP_USER_ID ?? "local-user";
}
