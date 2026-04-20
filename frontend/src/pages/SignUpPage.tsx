import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";

// サインアップと確認コード入力を同一画面にまとめ、メール確認完了まで流れを切らさない。
export function SignUpPage() {
  const { confirmSignUp, resendConfirmationCode, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [phase, setPhase] = useState<"register" | "confirm">("register");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("パスワード確認が一致しません。");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");
      await signUp(email, password);
      setPhase("confirm");
      setMessage("確認コードをメールへ送信しました。受信したコードを入力してください。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "サインアップに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      await confirmSignUp(email, confirmationCode);
      navigate("/login", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "確認コードの検証に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      setLoading(true);
      setError("");
      await resendConfirmationCode(email);
      setMessage("確認コードを再送しました。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "確認コード再送に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <div>
        <p className="eyebrow">Sign Up</p>
        <h2>アカウントを作成する</h2>
        <p className="lead">メール確認が完了すると、ノート作成とAI相談を利用できます。</p>
      </div>

      {phase === "register" ? (
        <form className="stack" onSubmit={handleRegister}>
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
          <label className="field">
            <span>パスワード</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <label className="field">
            <span>パスワード確認</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "登録中..." : "サインアップ"}
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
          {message ? <p className="form-message">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <div className="button-group">
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "確認中..." : "確認コードを送信"}
            </button>
            <button className="secondary-button" disabled={loading} onClick={handleResend} type="button">
              コード再送
            </button>
          </div>
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
