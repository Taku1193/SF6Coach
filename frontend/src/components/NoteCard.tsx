import { Link } from "react-router-dom";
import { buildNoteTitle, getNoteTypeLabel, type Note } from "@shared/types";
import { FavoriteButton } from "./FavoriteButton";

type NoteCardProps = {
  note: Note;
  onToggleFavorite: (note: Note) => void | Promise<void>;
  favoriteDisabled?: boolean;
};

// ノート一覧で使うカード表示を行い、クリック時に詳細画面へ遷移させる。
export function NoteCard({ note, onToggleFavorite, favoriteDisabled = false }: NoteCardProps) {
  return (
    <article className="note-card">
      <Link className="note-card-link" to={`/notes/${note.noteId}`}>
        <div className="note-card-top">
          <span className={`note-type ${note.noteType}`}>{getNoteTypeLabel(note.noteType)}</span>
          <time>{new Date(note.updatedAt).toLocaleString("ja-JP")}</time>
        </div>
        <h3>{buildNoteTitle(note)}</h3>
        <div className="tag-list">
          {note.tags.length === 0 ? <span className="muted">タグなし</span> : note.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </Link>
      <div className="note-card-actions">
        <FavoriteButton disabled={favoriteDisabled} isFavorite={note.isFavorite} onClick={() => onToggleFavorite(note)} />
      </div>
    </article>
  );
}
