import { useState } from "react";

type TagInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
};

// タグを1件ずつ追加・削除する共通入力 UI を提供し、最終的なタグ配列を親へ返す。
export function TagInput({ value, onChange, placeholder = "例: 対空" }: TagInputProps) {
  const [draftTag, setDraftTag] = useState("");

  // 入力欄の文字列を1件のタグとして確定し、重複を避けつつ配列へ追加する。
  function handleAddTag() {
    const normalizedTag = draftTag.trim();
    if (!normalizedTag) {
      return;
    }

    // 同一タグの重複追加を防ぎ、表示順は入力順のまま保つ。
    if (value.includes(normalizedTag)) {
      setDraftTag("");
      return;
    }

    onChange([...value, normalizedTag]);
    setDraftTag("");
  }

  // 指定したタグだけを一覧から取り除き、更新後の配列を親へ返す。
  function handleRemoveTag(tagToRemove: string) {
    // クリックしたタグだけを取り除き、残りの順序は維持する。
    onChange(value.filter((tag) => tag !== tagToRemove));
  }

  // Enter キー押下時にも追加ボタンと同じ動きをさせ、入力体験を揃える。
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // 1件ずつ追加する UI なので、Enter でも「追加」ボタンと同じ動きに寄せる。
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleAddTag();
  }

  return (
    <div className="field">
      <span>タグ</span>
      <input
        value={draftTag}
        onChange={(event) => setDraftTag(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      <button className="secondary-button tag-add-button" onClick={handleAddTag} type="button">
        追加
      </button>
      <div className="tag-list">
        {value.length === 0 ? (
          <span className="muted">タグはまだ追加されていません。</span>
        ) : (
          value.map((tag) => (
            <button key={tag} className="tag-chip" onClick={() => handleRemoveTag(tag)} type="button">
              {tag}
              <span className="tag-chip-remove">削除</span>
            </button>
          ))
        )}
      </div>
      <small>1件ずつ入力して追加します。表示中のタグは削除できます。</small>
    </div>
  );
}
