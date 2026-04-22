import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildNoteTitle, type FocusIssueView, type Note, type NoteType } from "@shared/types";
import { api } from "../api";

const MAX_REFERENCE_NOTES = 3;

// 課題画面では、試合中に見るタイトルを主役にしつつ、編集フォームと参考ノート選択を同じ画面にまとめる。
export function FocusIssuePage() {
  const character = window.localStorage.getItem("sf6.selectedCharacter") ?? "";
  const [issue, setIssue] = useState<FocusIssueView | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [referenceNoteIds, setReferenceNoteIds] = useState<string[]>([]);
  const [referenceSearch, setReferenceSearch] = useState("");
  const [referenceTypeFilter, setReferenceTypeFilter] = useState<NoteType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    // 課題本体と参考ノート候補は同じキャラ条件で取得し、画面内の選択肢を同期させる。
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [issueResponse, notesResponse] = await Promise.all([
          api.getFocusIssue(character),
          api.listNotes(character)
        ]);

        if (cancelled) {
          return;
        }

        setIssue(issueResponse.issue);
        setNotes(notesResponse.notes);
        setTitle(issueResponse.issue?.title ?? "");
        setMemo(issueResponse.issue?.memo ?? "");
        setReferenceNoteIds(issueResponse.issue?.referenceNotes.map((note) => note.noteId) ?? []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "課題の取得に失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (character) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [character]);

  const selectedReferenceNotes = useMemo(
    () => referenceNoteIds.map((noteId) => notes.find((note) => note.noteId === noteId)).filter((note): note is Note => Boolean(note)),
    [notes, referenceNoteIds]
  );

  const filteredReferenceNotes = useMemo(() => {
    const normalizedSearch = referenceSearch.trim().toLowerCase();

    // 参考ノートが増えても探しやすいよう、画面表示と同じタイトル文字列で部分一致検索する。
    return notes.filter((note) => {
      const matchesType = referenceTypeFilter === "all" || note.noteType === referenceTypeFilter;
      const matchesTitle = !normalizedSearch || buildNoteTitle(note).toLowerCase().includes(normalizedSearch);

      return matchesType && matchesTitle;
    });
  }, [notes, referenceSearch, referenceTypeFilter]);

  // 参考ノートは最大3件に制限し、選択済みのものは再クリックで解除できるようにする。
  function handleToggleReference(noteId: string) {
    setReferenceNoteIds((currentIds) => {
      if (currentIds.includes(noteId)) {
        return currentIds.filter((currentId) => currentId !== noteId);
      }

      if (currentIds.length >= MAX_REFERENCE_NOTES) {
        return currentIds;
      }

      return [...currentIds, noteId];
    });
  }

  // 入力フォームの内容を現在課題として保存し、成功時は表示エリアも即時更新する。
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setError("課題タイトルを入力してください。");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await api.saveFocusIssue({
        character,
        title: title.trim(),
        memo: memo.trim(),
        referenceNoteIds
      });
      setIssue(response.issue);
      setReferenceNoteIds(response.issue?.referenceNotes.map((note) => note.noteId) ?? []);
      setMessage("課題を保存しました。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "課題の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="panel status">課題を読み込み中です。</div>;
  }

  return (
    <section className="stack">
      <section className="focus-hero panel">
        <p className="eyebrow">Current Focus</p>
        <span className="focus-character">{character}</span>
        <h2>{issue?.title || "現在の課題は未設定です"}</h2>
        {issue?.memo ? <p className="focus-memo">{issue.memo}</p> : <p className="focus-memo muted">課題を設定してください。</p>}
      </section>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Reference Notes</p>
          <h3>参考ノート</h3>
        </div>
        {selectedReferenceNotes.length === 0 ? (
          <p className="muted">参考ノートは未選択です。</p>
        ) : (
          <div className="reference-links">
            {selectedReferenceNotes.map((note) => (
              <Link className="reference-link" key={note.noteId} to={`/notes/${note.noteId}`}>
                <span className={`note-type ${note.noteType}`}>{note.noteType === "battleRecord" ? "対戦記録" : "動画要約"}</span>
                <strong>{buildNoteTitle(note)}</strong>
                <time>{new Date(note.updatedAt).toLocaleString("ja-JP")}</time>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="panel stack">
        <div className="section-header">
          <div>
            <p className="eyebrow">Edit Focus</p>
            <h3>課題を編集する</h3>
          </div>
          <Link className="link-button" to="/notes">
            ノート一覧へ
          </Link>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>課題タイトル</span>
            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="対空を意識する"
              rows={2}
            />
          </label>
          <label className="field">
            <span>メモ</span>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="前ジャンプを見たらまず対空。無理に前へ出ない。"
              rows={4}
            />
          </label>

          <div className="stack">
            <div>
              <span className="field-label">参考ノート</span>
              <p className="muted">対戦記録・動画要約から最大3件まで選択できます。</p>
            </div>
            <label className="field">
              <span>参考ノート検索</span>
              <input
                value={referenceSearch}
                onChange={(event) => setReferenceSearch(event.target.value)}
                placeholder="ノートタイトルで検索"
              />
            </label>
            <label className="field">
              <span>参考ノート種別</span>
              <select value={referenceTypeFilter} onChange={(event) => setReferenceTypeFilter(event.target.value as NoteType | "all")}>
                <option value="all">すべて</option>
                <option value="battleRecord">対戦記録</option>
                <option value="videoSummary">動画要約</option>
              </select>
            </label>
            {notes.length === 0 ? (
              <div className="status">参考にできるノートはまだありません。</div>
            ) : filteredReferenceNotes.length === 0 ? (
              <div className="status">条件に一致する参考ノートはありません。</div>
            ) : (
              <div className="reference-picker">
                {filteredReferenceNotes.map((note) => {
                  const checked = referenceNoteIds.includes(note.noteId);
                  const disabled = !checked && referenceNoteIds.length >= MAX_REFERENCE_NOTES;
                  return (
                    <label className={`reference-option${disabled ? " disabled" : ""}`} key={note.noteId}>
                      <input
                        checked={checked}
                        disabled={disabled}
                        onChange={() => handleToggleReference(note.noteId)}
                        type="checkbox"
                      />
                      <span className={`note-type ${note.noteType}`}>{note.noteType === "battleRecord" ? "対戦記録" : "動画要約"}</span>
                      <strong>{buildNoteTitle(note)}</strong>
                      <time>{new Date(note.updatedAt).toLocaleString("ja-JP")}</time>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {error ? <div className="status error">{error}</div> : null}
          {message ? <div className="form-message">{message}</div> : null}
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "保存中..." : "課題を保存する"}
          </button>
        </form>
      </section>
    </section>
  );
}
