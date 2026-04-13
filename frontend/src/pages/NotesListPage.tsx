import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Note, NoteType } from "@shared/types";
import { api } from "../api";
import { NoteCard } from "../components/NoteCard";

// 選択中キャラのノート一覧を取得し、画面内フィルタを適用して表示する。
export function NotesListPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoritePendingId, setFavoritePendingId] = useState("");
  const [noteTypeFilter, setNoteTypeFilter] = useState<NoteType | "all">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const character = window.localStorage.getItem("sf6.selectedCharacter") ?? "";

  useEffect(() => {
    let cancelled = false;

    // API からノート一覧を取得し、状態へ反映する。
    async function load() {
      try {
        setLoading(true);
        setError("");
        const response = await api.listNotes(character, favoriteOnly);
        if (!cancelled) {
          setNotes(response.notes);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "一覧取得に失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // 選択キャラが決まっている時だけ API を叩く。
    if (character) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [character, favoriteOnly]);

  const filteredNotes = useMemo(() => {
    // API 側の取得条件は「キャラ」までにとどめ、種別やタグの絞り込みは画面側で即時反映する。
    return notes.filter((note) => {
      const matchesType = noteTypeFilter === "all" || note.noteType === noteTypeFilter;
      const matchesTag =
        tagFilter.trim() === "" ||
        note.tags.some((tag) => tag.toLowerCase().includes(tagFilter.trim().toLowerCase()));
      const matchesFavorite = !favoriteOnly || note.isFavorite;

      return matchesType && matchesTag && matchesFavorite;
    });
  }, [favoriteOnly, noteTypeFilter, notes, tagFilter]);

  // 一覧から星を押した時に対象ノートだけを更新し、全件再取得なしで表示を同期する。
  async function handleToggleFavorite(targetNote: Note) {
    try {
      setFavoritePendingId(targetNote.noteId);
      setError("");
      const response = await api.updateFavorite(targetNote.noteId, {
        isFavorite: !targetNote.isFavorite
      });
      setNotes((currentNotes) => currentNotes.map((note) => (note.noteId === response.note.noteId ? response.note : note)));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "お気に入り更新に失敗しました。");
    } finally {
      setFavoritePendingId("");
    }
  }

  return (
    <section className="stack">
      <div className="panel panel-row">
        <div>
          <p className="eyebrow">Notes</p>
          <h2>{character} の学習ノート</h2>
          <p className="lead">新しい反省と動画知識を一か所に集めます。</p>
        </div>
        <div className="button-group">
          <Link className="secondary-button" to="/notes/new/battle-record">
            対戦記録を追加
          </Link>
          <Link className="primary-button" to="/notes/new/video-summary">
            動画要約を追加
          </Link>
        </div>
      </div>

      <div className="panel filters">
        <label className="field">
          <span>種別フィルタ</span>
          <select value={noteTypeFilter} onChange={(event) => setNoteTypeFilter(event.target.value as NoteType | "all")}>
            <option value="all">すべて</option>
            <option value="battleRecord">対戦記録</option>
            <option value="videoSummary">動画要約</option>
          </select>
        </label>
        <label className="field">
          <span>タグ検索</span>
          <input
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            placeholder="設置対応"
          />
        </label>
        <label className="checkbox-field">
          <input checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} type="checkbox" />
          <span>お気に入りのみ表示する</span>
        </label>
        <Link className="link-button" to="/consultation">
          AI相談へ
        </Link>
      </div>

      {loading ? <div className="panel status">ノートを読み込み中です。</div> : null}
      {error ? <div className="panel status error">{error}</div> : null}

      {!loading && !error ? (
        filteredNotes.length === 0 ? (
          <div className="panel status">条件に一致するノートはまだありません。</div>
        ) : (
          <div className="notes-grid">
            {filteredNotes.map((note) => (
              <NoteCard
                favoriteDisabled={favoritePendingId === note.noteId}
                key={note.noteId}
                note={note}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
