import { useEffect, useMemo, useState } from "react";
import type { AiConsultationResponse, NoteType } from "@shared/types";
import { getCharacterNames } from "@shared/characters";
import { api } from "../api";

// 条件付きで AI 相談を実行し、返ってきた要約・改善点・次アクションを表示する。
export function AiConsultationPage() {
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter") ?? "Luke";
  const characterNames = useMemo(() => getCharacterNames(), []);
  const [opponentCharacter, setOpponentCharacter] = useState("");
  const [consultationText, setConsultationText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagLoading, setTagLoading] = useState(true);
  const [tagError, setTagError] = useState("");
  const [noteTypeScope, setNoteTypeScope] = useState<"both" | NoteType>("both");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<AiConsultationResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    // AI相談のタグは既存ノート由来に限定し、存在しないタグを相談条件に入れないようにする。
    async function loadTags() {
      try {
        setTagLoading(true);
        setTagError("");
        const result = await api.listNotes(selectedCharacter);
        const uniqueTags = Array.from(new Set(result.notes.flatMap((note) => note.tags))).sort((left, right) =>
          left.localeCompare(right, "ja")
        );

        if (!cancelled) {
          setAvailableTags(uniqueTags);
          setTags((currentTags) => currentTags.filter((tag) => uniqueTags.includes(tag)));
        }
      } catch (loadError) {
        if (!cancelled) {
          setTagError(loadError instanceof Error ? loadError.message : "タグ候補の取得に失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setTagLoading(false);
        }
      }
    }

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [selectedCharacter]);

  const filteredTags = useMemo(() => {
    const normalizedSearch = tagSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return availableTags;
    }

    return availableTags.filter((tag) => tag.toLowerCase().includes(normalizedSearch));
  }, [availableTags, tagSearch]);

  // 候補タグを押すたびに選択・解除を切り替え、AI相談へ渡すタグを候補内に限定する。
  function handleToggleTag(tag: string) {
    setTags((currentTags) =>
      currentTags.includes(tag) ? currentTags.filter((currentTag) => currentTag !== tag) : [...currentTags, tag]
    );
  }

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
            <select value={opponentCharacter} onChange={(event) => setOpponentCharacter(event.target.value)}>
              <option value="">指定なし</option>
              {characterNames.map((characterName) => (
                <option key={characterName} value={characterName}>
                  {characterName}
                </option>
              ))}
            </select>
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
          <div className="field">
            <span>タグ</span>
            <input
              value={tagSearch}
              onChange={(event) => setTagSearch(event.target.value)}
              placeholder="タグ候補を検索"
            />
            {tagLoading ? <div className="status">タグ候補を読み込み中です。</div> : null}
            {tagError ? <div className="status error">{tagError}</div> : null}
            {!tagLoading && !tagError ? (
              availableTags.length === 0 ? (
                <div className="status">選択できるタグはありません。</div>
              ) : filteredTags.length === 0 ? (
                <div className="status">条件に一致するタグはありません。</div>
              ) : (
                <div className="tag-selector">
                  {filteredTags.map((tag) => {
                    const selected = tags.includes(tag);
                    return (
                      <button
                        className={`tag-choice${selected ? " selected" : ""}`}
                        key={tag}
                        onClick={() => handleToggleTag(tag)}
                        type="button"
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )
            ) : null}
            <small>既存ノートにあるタグから選択します。存在しないタグは指定できません。</small>
          </div>
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
