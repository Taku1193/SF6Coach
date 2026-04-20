export type AuthSession = {
  accessToken: string;
  email: string;
  idToken: string;
  refreshToken: string;
  sub: string;
};

type CognitoAuthResult = {
  AccessToken?: string;
  IdToken?: string;
  RefreshToken?: string;
};

type StoredAuthSession = AuthSession;

const STORAGE_KEY = "sf6.auth.session";

// Vite 環境変数から Cognito 設定を取得し、設定漏れは画面上の明示エラーに変える。
function getCognitoConfig() {
  const region = import.meta.env.VITE_COGNITO_REGION ?? "";
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? "";

  if (!region || !clientId) {
    throw new Error("Cognito の設定が不足しています。VITE_COGNITO_REGION と VITE_COGNITO_CLIENT_ID を確認してください。");
  }

  return {
    clientId,
    endpoint: `https://cognito-idp.${region}.amazonaws.com/`
  };
}

// Base64URL 形式の JWT payload を復元し、期限や email を読むための object へ変換する。
function parseJwtPayload(token: string): Record<string, unknown> {
  const encodedPayload = token.split(".")[1];
  if (!encodedPayload) {
    throw new Error("JWT の形式が不正です。");
  }

  const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = window.atob(padded);

  return JSON.parse(decoded) as Record<string, unknown>;
}

// JWT の exp を見て、一定時間以内に失効するトークンを期限切れ扱いにする。
function isExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  const now = Math.floor(Date.now() / 1000);

  return exp <= now + 60;
}

// Cognito API の成功/失敗形式を吸収し、画面表示向けのメッセージへ変換する。
async function callCognito<T>(target: string, payload: Record<string, unknown>): Promise<T> {
  const { endpoint } = getCognitoConfig();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  const parsed = raw ? (JSON.parse(raw) as { __type?: string; message?: string }) : {};
  if (!response.ok) {
    const message = parsed.message || "認証処理に失敗しました。";
    throw new Error(message);
  }

  return (parsed as T) ?? ({} as T);
}

// 認証レスポンスから token 群を取り出し、画面側で使いやすい session へ整形する。
function buildSession(authResult: CognitoAuthResult, refreshTokenFallback = ""): AuthSession {
  if (!authResult.IdToken || !authResult.AccessToken) {
    throw new Error("Cognito から認証トークンを取得できませんでした。");
  }

  const payload = parseJwtPayload(authResult.IdToken);
  const email = typeof payload.email === "string" ? payload.email : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";

  return {
    accessToken: authResult.AccessToken,
    email,
    idToken: authResult.IdToken,
    refreshToken: authResult.RefreshToken ?? refreshTokenFallback,
    sub
  };
}

// ブラウザ保存済みのセッションを読み込み、再訪時のログイン継続に使う。
export function getStoredSession(): AuthSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// 認証成功時に token 群をローカルへ保存し、以後の API 呼び出しから参照できるようにする。
function saveSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

// ログアウトや認証失敗時に保存済み token を破棄し、別ユーザーへ引き継がないようにする。
export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

// 既存 refresh token を使って新しい id/access token を再取得し、再ログイン頻度を下げる。
async function refreshSession(session: AuthSession): Promise<AuthSession> {
  const { clientId } = getCognitoConfig();
  const response = await callCognito<{ AuthenticationResult?: CognitoAuthResult }>("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: clientId,
    AuthParameters: {
      REFRESH_TOKEN: session.refreshToken
    }
  });

  const refreshed = buildSession(response.AuthenticationResult ?? {}, session.refreshToken);
  saveSession(refreshed);
  return refreshed;
}

// 保存済み session を復元し、期限切れなら refresh token で自動更新する。
export async function restoreSession(): Promise<AuthSession | null> {
  const session = getStoredSession();
  if (!session) {
    return null;
  }

  if (!isExpired(session.idToken)) {
    return session;
  }

  if (!session.refreshToken) {
    clearStoredSession();
    return null;
  }

  try {
    return await refreshSession(session);
  } catch {
    clearStoredSession();
    return null;
  }
}

// API 呼び出し直前に有効な id token を返し、期限切れ時は自動更新を試みる。
export async function getValidIdToken(): Promise<string> {
  const session = await restoreSession();
  return session?.idToken ?? "";
}

// メールアドレス + パスワードでログインし、以後の API 用 token 群を保存する。
export async function signIn(email: string, password: string): Promise<AuthSession> {
  const { clientId } = getCognitoConfig();
  const response = await callCognito<{ AuthenticationResult?: CognitoAuthResult }>("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email.trim(),
      PASSWORD: password
    }
  });

  const session = buildSession(response.AuthenticationResult ?? {});
  saveSession(session);
  return session;
}

// 新規ユーザーを作成し、Cognito のメール確認コード送信までを開始する。
export async function signUp(email: string, password: string) {
  const { clientId } = getCognitoConfig();
  return callCognito("SignUp", {
    ClientId: clientId,
    Username: email.trim(),
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email.trim()
      }
    ]
  });
}

// サインアップ後に受け取った確認コードを送信し、ログイン可能状態へ切り替える。
export async function confirmSignUp(email: string, code: string) {
  const { clientId } = getCognitoConfig();
  return callCognito("ConfirmSignUp", {
    ClientId: clientId,
    Username: email.trim(),
    ConfirmationCode: code.trim()
  });
}

// 確認コード紛失時に、同じメールアドレス宛てへ再送を依頼する。
export async function resendConfirmationCode(email: string) {
  const { clientId } = getCognitoConfig();
  return callCognito("ResendConfirmationCode", {
    ClientId: clientId,
    Username: email.trim()
  });
}

// パスワード再設定メールを送信し、確認コード入力フェーズへ進める。
export async function requestPasswordReset(email: string) {
  const { clientId } = getCognitoConfig();
  return callCognito("ForgotPassword", {
    ClientId: clientId,
    Username: email.trim()
  });
}

// 確認コードと新パスワードを送信し、パスワード再設定を完了する。
export async function confirmPasswordReset(email: string, code: string, password: string) {
  const { clientId } = getCognitoConfig();
  return callCognito("ConfirmForgotPassword", {
    ClientId: clientId,
    Username: email.trim(),
    ConfirmationCode: code.trim(),
    Password: password
  });
}

// 現在の access token を使って Cognito 側のセッションも切り、ローカル保存も破棄する。
export async function signOut() {
  const session = getStoredSession();

  try {
    if (session?.accessToken) {
      await callCognito("GlobalSignOut", {
        AccessToken: session.accessToken
      });
    }
  } finally {
    clearStoredSession();
  }
}
