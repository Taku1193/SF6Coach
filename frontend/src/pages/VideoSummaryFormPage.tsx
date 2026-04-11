import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { VideoSummaryNote } from "@shared/types";
import { api } from "../api";
import { TagInput } from "../components/TagInput";

type VideoSummaryFormPageProps = {
  mode: "create" | "edit";
};

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function VideoSummaryFormPage(_: VideoSummaryFormPageProps) {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const selectedCharacter = window.localStorage.getItem("sf6.selectedCharacter") ?? "Luke";
  const [videoTitle, setVideoTitle] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentNoteId = noteId;
    if (!currentNoteId) {
      return;
    }

    let cancelled = false;

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
        setTagsInput(note.tags.join(", "));
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!videoTitle.trim() || !summary.trim()) {
      setError("動画タイトルと要約は必須です。");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const payload = {
        character: selectedCharacter,
        videoTitle: videoTitle.trim(),
        url: url.trim(),
        summary: summary.trim(),
        tags: parseTags(tagsInput)
      };

      const response = noteId ? await api.updateNote(noteId, payload) : await api.createVideoSummary(payload);
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
        <TagInput value={tagsInput} onChange={setTagsInput} />
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
