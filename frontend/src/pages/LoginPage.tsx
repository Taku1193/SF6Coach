import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";

type LoginLocationState = {
  from?: string;
};

// ログイン画面では Cognito の signIn を呼び出し、認証成功後に元の導線へ戻す。
export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LoginLocationState;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      await signIn(email, password);
      const hasSelectedCharacter = Boolean(window.localStorage.getItem("sf6.selectedCharacter"));
      navigate(state.from ?? (hasSelectedCharacter ? "/notes" : "/characters"), { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <div>
        <p className="eyebrow">Login</p>
        <h2>メールアドレスでログインする</h2>
        <p className="lead">ノートとAI相談は、認証済みユーザーごとに分離して管理します。</p>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>
      <div className="auth-links">
        <Link className="link-button" to="/signup">
          サインアップ
        </Link>
        <Link className="link-button" to="/forgot-password">
          パスワードを忘れた場合
        </Link>
      </div>
    </section>
  );
}
