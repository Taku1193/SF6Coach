type TagInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function TagInput({ value, onChange, placeholder = "JP, 対空, 設置対応" }: TagInputProps) {
  return (
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
