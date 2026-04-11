import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCharacterNames } from "@shared/characters";

export function CharacterSelectionPage() {
  const navigate = useNavigate();
  const characters = useMemo(() => getCharacterNames(), []);
  const [character, setCharacter] = useState(window.localStorage.getItem("sf6.selectedCharacter") ?? "Luke");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!character.trim()) {
      return;
    }

    window.localStorage.setItem("sf6.selectedCharacter", character.trim());
    navigate("/notes");
  }

  return (
    <section className="panel hero-panel">
      <div>
        <p className="eyebrow">MVP</p>
        <h2>使用キャラを選んで学習ノートを始める</h2>
        <p className="lead">
          対戦記録と動画要約をキャラ単位で蓄積し、次に直すポイントをAI相談で整理します。
        </p>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>使用キャラ</span>
          <select value={character} onChange={(event) => setCharacter(event.target.value)}>
            {characters.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="submit">
          ノートを開く
        </button>
      </form>
    </section>
  );
}
