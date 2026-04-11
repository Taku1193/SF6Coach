type TagInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function TagInput({ value, onChange, placeholder = "JP, 対空, 設置対応" }: TagInputProps) {
  return (
    // タグの入力 UI は複数画面で共通なので、表記ゆれを減らすために共通化している。
    <label className="field">
      <span>タグ</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <small>カンマ区切りで複数入力できます。</small>
    </label>
  );
}
