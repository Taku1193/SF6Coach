// 必須環境変数を取得し、未設定時は明示的にエラーにする。
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
