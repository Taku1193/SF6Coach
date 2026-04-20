import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  confirmPasswordReset,
  confirmSignUp,
  type AuthSession,
  requestPasswordReset,
  resendConfirmationCode,
  restoreSession,
  signIn,
  signOut,
  signUp
} from "../lib/cognito-auth";

type AuthContextValue = {
  confirmPasswordReset: (email: string, code: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  requestPasswordReset: (email: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  session: AuthSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

// アプリ全体で認証状態と Cognito 操作を共有し、各画面が token 保存処理を重複実装しないようにする。
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 初回表示時に保存済み session を復元し、期限切れなら refresh token で更新する。
    async function bootstrap() {
      try {
        const restored = await restoreSession();
        if (!cancelled) {
          setSession(restored);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // ログイン成功時は最新 session を context へ保持し、以後の画面ガードに使う。
  async function handleSignIn(email: string, password: string) {
    const nextSession = await signIn(email, password);
    setSession(nextSession);
  }

  // サインアップは session を作らず、確認コード入力フェーズへ進むだけにとどめる。
  async function handleSignUp(email: string, password: string) {
    await signUp(email, password);
  }

  // メール確認完了後はログイン画面へ戻す想定のため、context state は変更しない。
  async function handleConfirmSignUp(email: string, code: string) {
    await confirmSignUp(email, code);
  }

  // 確認コード再送では結果オブジェクトを使わないため、呼び出し側には成功/失敗だけ伝える。
  async function handleResendConfirmationCode(email: string) {
    await resendConfirmationCode(email);
  }

  // 再設定メール送信も UI 側で本文を使わないため、Promise<void> へ丸める。
  async function handleRequestPasswordReset(email: string) {
    await requestPasswordReset(email);
  }

  // 確認コードによるパスワード更新は、完了可否だけを画面へ返せば十分。
  async function handleConfirmPasswordReset(email: string, code: string, password: string) {
    await confirmPasswordReset(email, code, password);
  }

  // ログアウト時は Cognito セッションと画面状態を両方破棄する。
  async function handleSignOut() {
    await signOut();
    window.localStorage.removeItem("sf6.selectedCharacter");
    setSession(null);
  }

  const value: AuthContextValue = {
    confirmPasswordReset: handleConfirmPasswordReset,
    confirmSignUp: handleConfirmSignUp,
    isAuthenticated: session !== null,
    isLoading,
    requestPasswordReset: handleRequestPasswordReset,
    resendConfirmationCode: handleResendConfirmationCode,
    session,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signUp: handleSignUp
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 認証状態を参照する共通 hook。Provider 外で呼ばれた場合は即座に実装ミスを検知する。
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
