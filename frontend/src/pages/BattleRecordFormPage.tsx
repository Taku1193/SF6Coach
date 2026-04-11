import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCharacterNames } from "@shared/characters";
import { isBattleRecordNote } from "@shared/types";
import { api } from "../api";
import { TagInput } from "../components/TagInput";

type BattleRecordFormPageProps = {
  mode: "create" | "edit";
};

const RESULT_SCORES = ["0", "1", "2"] as const;
const RESULT_OUTCOMES = ["win", "lose", "draw"] as const;

// 保存済みの "2-1 win" 形式を、編集画面で扱う3つの入力値へ分解する。
function parseResult(value: string): { myScore: string; opponentScore: string; outcome: string } {
  // 保存形式は "2-1 win" の1文字列なので、編集画面では3つの入力値へ分解し直す。
  const match = value.trim().match(/^([0-2])-([0-2])\s+(win|lose|draw)$/i);
  if (!match) {
    // 旧データや手入力データが崩れていても、編集画面自体は開けるよう安全側に倒す。
    return { myScore: "0", opponentScore: "0", outcome: "lose" };
  }

  return {
    myScore: match[1],
    opponentScore: match[2],
    outcome: match[3].toLowerCase()
  };
}

// 画面上の3つの勝敗入力を、保存互換の "2-1 win" 形式へ組み立てる。
function buildResult(myScore: string, opponentScore: string, outcome: string): string {
  // バックエンドと既存データとの互換性を保つため、保存時は従来通り1文字列にまとめる。
  return `${myScore}-${opponentScore} ${outcome}`;
}

// 対戦記録ノートの作成・編集フォームを表示し、保存用 payload を組み立てて送信する。
export function BattleRecordFormPage(_: BattleRecordFormPageProps) {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter") ?? "Luke";
  const characterNames = useMemo(() => getCharacterNames(), []);
  const [character] = useState(selectedCharacter);
  const [opponentCharacter, setOpponentCharacter] = useState("");
  const [myResultScore, setMyResultScore] = useState("0");
  const [opponentResultScore, setOpponentResultScore] = useState("0");
  const [resultOutcome, setResultOutcome] = useState("lose");
  const [goodPoints, setGoodPoints] = useState("");
  const [improvements, setImprovements] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentNoteId = noteId;
    if (!currentNoteId) {
      return;
    }

    let cancelled = false;

    // 編集時に既存ノートを読み込み、フォーム初期値として反映する。
    async function load(resolvedNoteId: string) {
      try {
        setLoading(true);
        const response = await api.getNote(resolvedNoteId);
        if (cancelled || !isBattleRecordNote(response.note)) {
          return;
        }

        setOpponentCharacter(response.note.opponentCharacter);
        const parsedResult = parseResult(response.note.result);
        setMyResultScore(parsedResult.myScore);
        setOpponentResultScore(parsedResult.opponentScore);
        setResultOutcome(parsedResult.outcome);
        setGoodPoints(response.note.goodPoints);
        setImprovements(response.note.improvements);
        setTags(response.note.tags);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "ノート取得に失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load(currentNoteId);

    return () => {
      cancelled = true;
    };
  }, [noteId]);

  // フォーム入力を検証し、作成または更新 API へ送信する。
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!opponentCharacter.trim()) {
      setError("対戦相手キャラと勝敗は必須です。");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // 入力 UI は分かれているが、API には既存仕様どおりの payload を送る。
      const payload = {
        character,
        opponentCharacter: opponentCharacter.trim(),
        result: buildResult(myResultScore, opponentResultScore, resultOutcome),
        goodPoints: goodPoints.trim(),
        improvements: improvements.trim(),
        tags
      };

      const response = noteId ? await api.updateNote(noteId, payload) : await api.createBattleRecord(payload);
      navigate(`/notes/${response.note.noteId}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Battle Record</p>
          <h2>{noteId ? "対戦記録ノートを編集" : "対戦記録ノートを作成"}</h2>
        </div>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>使用キャラ</span>
          <input value={character} disabled />
        </label>
        <label className="field">
          <span>対戦相手キャラ</span>
          <input
            list="sf6-character-options"
            value={opponentCharacter}
            onChange={(event) => setOpponentCharacter(event.target.value)}
            placeholder="JP"
          />
          <datalist id="sf6-character-options">
            {characterNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>勝敗</span>
          {/* 「2-1 win」の形を迷わず作れるよう、数値と結果を個別入力にしている。 */}
          <div className="result-field">
            <select aria-label="自分の勝利数" value={myResultScore} onChange={(event) => setMyResultScore(event.target.value)}>
              {RESULT_SCORES.map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
            <span className="result-separator">-</span>
            <select
              aria-label="相手の勝利数"
              value={opponentResultScore}
              onChange={(event) => setOpponentResultScore(event.target.value)}
            >
              {RESULT_SCORES.map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
            <select value={resultOutcome} onChange={(event) => setResultOutcome(event.target.value)}>
              {RESULT_OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {outcome}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="field">
          <span>良かったところ</span>
          <textarea value={goodPoints} onChange={(event) => setGoodPoints(event.target.value)} rows={4} />
        </label>
        <label className="field">
          <span>改善点</span>
          <textarea value={improvements} onChange={(event) => setImprovements(event.target.value)} rows={5} />
        </label>
        <TagInput value={tags} onChange={setTags} />
        {error ? <div className="status error">{error}</div> : null}
        <div className="button-group">
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "保存中..." : "保存する"}
          </button>
          <button className="secondary-button" onClick={() => navigate(-1)} type="button">
            キャンセル
          </button>
        </div>
      </form>
    </section>
  );
}
