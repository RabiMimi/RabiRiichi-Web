import React from 'react';

interface LanguageSelectorProps {
  language: string;
  onChange: (lang: string) => void;
}

export function LanguageSelector({
  language,
  onChange,
}: LanguageSelectorProps): React.JSX.Element {
  return (
    <select
      value={language}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 rounded bg-[#1a1a1a] text-white border border-[#555] cursor-pointer text-sm outline-none focus:border-[#ff7a99]"
    >
      <option value="zhs">简体中文</option>
      <option value="en">English</option>
      <option value="ja">日本語</option>
    </select>
  );
}
