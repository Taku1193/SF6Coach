import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { VideoSummaryNote } from "@shared/types";
import { api } from "../api";
import { TagInput } from "../components/TagInput";

type VideoSummaryFormPageProps = {
  mode: "create" | "edit";
};

// 動画要約ノートの作成・編集フォームを表示し、保存用 payload を組み立てて送信する。
export function VideoSummaryFormPage(_: VideoSummaryFormPageProps) {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter") ?? "Luke";
  const [videoTitle, setVideoTitle] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentNoteId = noteId;
    if (!currentNoteId) {
      return;
    }

    let cancelled = false;

    // 編集対象の動画要約ノートを読み込み、フォームへ反映する。
    async function load(resolvedNoteId: string) {
      try {
        setLoading(true);
        const response = await api.getNote(resolvedNoteId);
        if (cancelled || response.note.noteType !== "videoSummary") {
          return;
        }

        const note = response.note as VideoSummaryNote;
        setVideoTitle(note.videoTitle);
        setUrl(note.url);
        setSummary(note.summary);
        setTags(note.tags);
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

  // 入力済みの動画情報とタグをまとめ、作成または更新 API へ送信する。
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!videoTitle.trim() || !summary.trim()) {
      setError("動画タイトルと要約は必須です。");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // URL は任意入力なので、空文字のままでも保存できるようにしている。
      const payload = {
        character: selectedCharacter,
        videoTitle: videoTitle.trim(),
        url: url.trim(),
        summary: summary.trim(),
        tags
      };

      const response = noteId ? await api.updateNote(noteId, payload) : await api.createVideoSummary(payload);
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
          <p className="eyebrow">Video Summary</p>
          <h2>{noteId ? "動画要約ノートを編集" : "動画要約ノートを作成"}</h2>
        </div>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>使用キャラ</span>
          <input value={selectedCharacter} disabled />
        </label>
        <label className="field">
          <span>動画タイトル</span>
          <input value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} />
        </label>
        <label className="field">
          <span>URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/..." />
        </label>
        <label className="field">
          <span>要約</span>
          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={8} />
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
