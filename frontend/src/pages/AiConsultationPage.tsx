import { useState } from "react";
import type { AiConsultationResponse, NoteType } from "@shared/types";
import { api } from "../api";
import { TagInput } from "../components/TagInput";

// 条件付きで AI 相談を実行し、返ってきた要約・改善点・次アクションを表示する。
export function AiConsultationPage() {
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter") ?? "Luke";
  const [opponentCharacter, setOpponentCharacter] = useState("");
  const [consultationText, setConsultationText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [noteTypeScope, setNoteTypeScope] = useState<"both" | NoteType>("both");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<AiConsultationResponse | null>(null);

  // 相談条件を payload にまとめ、AI 相談 API を呼び出して結果を反映する。
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!consultationText.trim()) {
      setError("相談内容を入力してください。");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // 相談ごとに前回結果を消し、ローディング中に古い内容が残らないようにする。
      setResponse(null);
      const noteTypes: NoteType[] =
        noteTypeScope === "both" ? ["battleRecord", "videoSummary"] : [noteTypeScope];
      const result = await api.consult({
        character: selectedCharacter,
        opponentCharacter: opponentCharacter.trim() || undefined,
        consultationText: consultationText.trim(),
        tags,
        noteTypes
      });
      setResponse(result);
    } catch (consultationError) {
      setError(consultationError instanceof Error ? consultationError.message : "AI相談に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="stack">
      <div className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">AI Consultation</p>
            <h2>{selectedCharacter} の改善ポイントを整理する</h2>
          </div>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>使用キャラ</span>
            <input value={selectedCharacter} disabled />
          </label>
          <label className="field">
            <span>相手キャラ</span>
            <input value={opponentCharacter} onChange={(event) => setOpponentCharacter(event.target.value)} placeholder="JP" />
          </label>
          <label className="field">
            <span>相談内容</span>
            <textarea
              value={consultationText}
              onChange={(event) => setConsultationText(event.target.value)}
              rows={7}
              placeholder="JP戦でヴィーハト設置後に毎回崩される。何を意識すべき？"
            />
          </label>
          <TagInput value={tags} onChange={setTags} placeholder="例: 設置対応" />
          <label className="field">
            <span>参照ノート種別</span>
            <select value={noteTypeScope} onChange={(event) => setNoteTypeScope(event.target.value as "both" | NoteType)}>
              <option value="both">両方</option>
              <option value="battleRecord">対戦記録のみ</option>
              <option value="videoSummary">動画要約のみ</option>
            </select>
          </label>
          {error ? <div className="status error">{error}</div> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "ノートを整理して相談中..." : "AIに相談する"}
          </button>
        </form>
      </div>

      {response ? (
        // API は要約・改善点・次アクションを分けて返すため、画面も同じ粒度で表示する。
        <section className="panel stack">
          <div>
            <p className="eyebrow">Result</p>
            <h3>相談結果</h3>
          </div>
          <div className="result-section">
            <h4>相談内容の整理</h4>
            <p>{response.summary}</p>
          </div>
          <div className="result-section">
            <h4>改善ポイント</h4>
            <ul>
              {response.improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="result-section">
            <h4>次に意識すること</h4>
            <ul>
              {response.nextActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="result-section">
            <h4>参考ノート</h4>
            <ul>
              {response.referenceNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </section>
  );
}
