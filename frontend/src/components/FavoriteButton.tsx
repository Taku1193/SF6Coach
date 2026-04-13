type FavoriteButtonProps = {
  isFavorite: boolean;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

// ノート一覧と詳細で共通利用する星ボタンをまとめ、見た目と aria-label を揃える。
export function FavoriteButton({ isFavorite, onClick, disabled = false, className = "" }: FavoriteButtonProps) {
  return (
    <button
      aria-label={isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
      className={`favorite-button ${isFavorite ? "active" : ""} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <svg aria-hidden="true" className="favorite-icon" viewBox="0 0 24 24">
        <path d="M12 2.75l2.84 5.75 6.35.92-4.6 4.48 1.09 6.33L12 17.25l-5.68 2.98 1.08-6.33-4.59-4.48 6.34-.92L12 2.75z" />
      </svg>
    </button>
  );
}
