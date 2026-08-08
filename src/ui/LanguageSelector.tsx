import React from 'react';
import { Select } from './Select';

interface LanguageSelectorProps {
  language: string;
  onChange: (lang: string) => void;
}

export function LanguageSelector({
  language,
  onChange,
}: LanguageSelectorProps): React.JSX.Element {
  return (
    <Select
      selectSize="compact"
      className="cursor-pointer"
      value={language}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="zhs">简体中文</option>
      <option value="en">English</option>
      <option value="ja">日本語</option>
    </Select>
  );
}
