import { Link } from "react-router-dom";
import { buildNoteTitle, type Note } from "@shared/types";

type NoteCardProps = {
  note: Note;
};

// ノート一覧で使うカード表示を行い、クリック時に詳細画面へ遷移させる。
export function NoteCard({ note }: NoteCardProps) {
  return (
    // 一覧カード全体をリンク化して、タップ/クリックの迷いを減らす。
    <Link className="note-card" to={`/notes/${note.noteId}`}>
      <div className="note-card-top">
        <span className={`note-type ${note.noteType}`}>{note.noteType === "battleRecord" ? "対戦記録" : "動画要約"}</span>
        <time>{new Date(note.updatedAt).toLocaleString("ja-JP")}</time>
      </div>
      <h3>{buildNoteTitle(note)}</h3>
      <div className="tag-list">
        {note.tags.length === 0 ? <span className="muted">タグなし</span> : note.tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
    </Link>
  );
}
