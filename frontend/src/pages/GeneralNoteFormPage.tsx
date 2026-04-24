import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isGeneralNote } from "@shared/types";
import { api } from "../api";
import { TagInput } from "../components/TagInput";

type GeneralNoteFormPageProps = {
  mode: "create" | "edit";
};

// その他ノートの作成・編集フォームを提供し、自由メモ用途を最短の入力で保存できるようにする。
export function GeneralNoteFormPage(_: GeneralNoteFormPageProps) {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter") ?? "Luke";
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentNoteId = noteId;
    if (!currentNoteId) {
      return;
    }

    let cancelled = false;

    // 編集時は既存のその他ノートを読み込み、タイトル・メモ・タグをそのまま再編集できるようにする。
    async function load(resolvedNoteId: string) {
      try {
        setLoading(true);
        const response = await api.getNote(resolvedNoteId);
        if (cancelled || !isGeneralNote(response.note)) {
          return;
        }

        setTitle(response.note.title);
        setMemo(response.note.memo);
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

  // タイトルとメモを必須として保存し、成功後は詳細画面へ遷移して即時反映する。
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim() || !memo.trim()) {
      setError("タイトルとメモは必須です。");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const payload = {
        character: selectedCharacter,
        title: title.trim(),
        memo: memo.trim(),
        tags
      };

      const response = noteId ? await api.updateNote(noteId, payload) : await api.createGeneralNote(payload);
      navigate(`/notes/${response.note.noteId}`, { state: { note: response.note } });
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
          <p className="eyebrow">General Note</p>
          <h2>{noteId ? "その他ノートを編集" : "その他ノートを作成"}</h2>
        </div>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>使用キャラ</span>
          <input value={selectedCharacter} disabled />
        </label>
        <label className="field">
          <span>タイトル</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span>メモ</span>
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={10} />
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
