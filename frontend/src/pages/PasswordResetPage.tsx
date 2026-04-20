import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";

// パスワード再設定は送信フェーズと確認フェーズを同一画面で扱い、操作量を減らす。
export function PasswordResetPage() {
  const { confirmPasswordReset, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [phase, setPhase] = useState<"request" | "confirm">("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");
      await requestPasswordReset(email);
      setPhase("confirm");
      setMessage("確認コードをメールへ送信しました。受信したコードと新しいパスワードを入力してください。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "再設定メール送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      await confirmPasswordReset(email, confirmationCode, nextPassword);
      navigate("/login", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "パスワード再設定に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <div>
        <p className="eyebrow">Reset Password</p>
        <h2>パスワードを再設定する</h2>
        <p className="lead">確認コードは登録済みメールアドレス宛に送信されます。</p>
      </div>

      {phase === "request" ? (
        <form className="stack" onSubmit={handleRequest}>
          <label className="field">
            <span>メールアドレス</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="player@example.com"
              type="email"
              value={email}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "送信中..." : "確認コードを送る"}
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={handleConfirm}>
          <label className="field">
            <span>メールアドレス</span>
            <input disabled type="email" value={email} />
          </label>
          <label className="field">
            <span>確認コード</span>
            <input onChange={(event) => setConfirmationCode(event.target.value)} value={confirmationCode} />
          </label>
          <label className="field">
            <span>新しいパスワード</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setNextPassword(event.target.value)}
              type="password"
              value={nextPassword}
            />
          </label>
          {message ? <p className="form-message">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "更新中..." : "パスワードを更新"}
          </button>
        </form>
      )}

      <div className="auth-links">
        <Link className="link-button" to="/login">
          ログインへ戻る
        </Link>
      </div>
    </section>
  );
}
