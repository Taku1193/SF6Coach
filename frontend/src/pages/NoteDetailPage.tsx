import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { buildNoteTitle, isBattleRecordNote, type Note } from "@shared/types";
import { api } from "../api";
import { FavoriteButton } from "../components/FavoriteButton";
import { BattleRecordFormPage } from "./BattleRecordFormPage";
import { VideoSummaryFormPage } from "./VideoSummaryFormPage";

type NoteDetailPageProps = {
  editMode?: boolean;
};

// ノート詳細の表示と削除を担当し、editMode 時は種別別の編集フォームへ切り替える。
export function NoteDetailPage({ editMode = false }: NoteDetailPageProps) {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteUpdating, setFavoriteUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // noteId に対応するノートを取得し、詳細表示または編集画面の土台にする。
    async function load() {
      if (!noteId) {
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await api.getNote(noteId);
        if (!cancelled) {
          setNote(response.note);
        }
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [noteId]);

  // ユーザー確認後にノートを削除し、一覧画面へ戻す。
  async function handleDelete() {
    if (!noteId) {
      return;
    }

    const confirmed = window.confirm("このノートを削除しますか？");
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteNote(noteId);
      navigate("/notes");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "削除に失敗しました。");
    }
  }

  // 詳細画面でも同じ API を使い、星の見た目だけ先に変えず保存結果で確定させる。
  async function handleToggleFavorite() {
    if (!note) {
      return;
    }

    try {
      setFavoriteUpdating(true);
      setError("");
      const response = await api.updateFavorite(note.noteId, {
        isFavorite: !note.isFavorite
      });
      setNote(response.note);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "お気に入り更新に失敗しました。");
    } finally {
      setFavoriteUpdating(false);
    }
  }

  if (loading) {
    return <div className="panel status">ノートを読み込み中です。</div>;
  }

  if (error) {
    return <div className="panel status error">{error}</div>;
  }

  if (!note) {
    return <div className="panel status">ノートが見つかりません。</div>;
  }

  if (editMode) {
    // 編集 UI はノート種別ごとに異なるため、詳細画面がそのまま分岐の入口も兼ねる。
    return note.noteType === "battleRecord" ? <BattleRecordFormPage mode="edit" /> : <VideoSummaryFormPage mode="edit" />;
  }

  return (
    <section className="stack">
      <div className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">{note.noteType === "battleRecord" ? "Battle Record" : "Video Summary"}</p>
            <h2>{buildNoteTitle(note)}</h2>
          </div>
          <div className="button-group">
            <Link className="secondary-button" to={`/notes/${note.noteId}/edit`}>
              編集
            </Link>
            <button className="danger-button" onClick={handleDelete} type="button">
              削除
            </button>
            <FavoriteButton
              className="detail-favorite-button"
              disabled={favoriteUpdating}
              isFavorite={note.isFavorite}
              onClick={handleToggleFavorite}
            />
          </div>
        </div>

        <dl className="detail-grid">
          <div>
            <dt>使用キャラ</dt>
            <dd>{note.character}</dd>
          </div>
          <div>
            <dt>タグ</dt>
            <dd className="tag-list">
              {note.tags.length === 0 ? <span className="muted">タグなし</span> : note.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </dd>
          </div>
          <div>
            <dt>作成日時</dt>
            <dd>{new Date(note.createdAt).toLocaleString("ja-JP")}</dd>
          </div>
          <div>
            <dt>更新日時</dt>
            <dd>{new Date(note.updatedAt).toLocaleString("ja-JP")}</dd>
          </div>
          {isBattleRecordNote(note) ? (
            <>
              <div>
                <dt>対戦相手キャラ</dt>
                <dd>{note.opponentCharacter}</dd>
              </div>
              <div>
                <dt>勝敗</dt>
                <dd>{note.result}</dd>
              </div>
              <div className="detail-block">
                <dt>良かったところ</dt>
                <dd>{note.goodPoints || "未入力"}</dd>
              </div>
              <div className="detail-block">
                <dt>改善点</dt>
                <dd>{note.improvements || "未入力"}</dd>
              </div>
            </>
          ) : (
            <>
              <div className="detail-block">
                <dt>動画タイトル</dt>
                <dd>{note.videoTitle}</dd>
              </div>
              <div className="detail-block">
                <dt>URL</dt>
                <dd>{note.url ? <a href={note.url}>{note.url}</a> : "未入力"}</dd>
              </div>
              <div className="detail-block">
                <dt>要約</dt>
                <dd>{note.summary}</dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </section>
  );
}
