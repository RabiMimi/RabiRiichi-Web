import React from 'react';
import { useTranslation } from 'react-i18next';

interface TabSelectorProps {
  activeTab: 'login' | 'register';
  setActiveTab: (tab: 'login' | 'register') => void;
  disabled: boolean;
  setError: (err: string | null) => void;
}

export function TabSelector({
  activeTab,
  setActiveTab,
  disabled,
  setError,
}: TabSelectorProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex border-b border-[#333] mb-4">
      <button
        type="button"
        className={`flex-1 py-2 text-center font-semibold text-sm transition-colors border-b-2 outline-none cursor-pointer ${
          activeTab === 'login'
            ? 'text-[#ff7a99] border-[#ff7a99]'
            : 'text-[#888] border-transparent hover:text-white'
        }`}
        onClick={() => {
          setActiveTab('login');
          setError(null);
        }}
        disabled={disabled}
      >
        {t('connect.loginTab')}
      </button>
      <button
        type="button"
        className={`flex-1 py-2 text-center font-semibold text-sm transition-colors border-b-2 outline-none cursor-pointer ${
          activeTab === 'register'
            ? 'text-[#ff7a99] border-[#ff7a99]'
            : 'text-[#888] border-transparent hover:text-white'
        }`}
        onClick={() => {
          setActiveTab('register');
          setError(null);
        }}
        disabled={disabled}
      >
        {t('connect.registerTab')}
      </button>
    </div>
  );
}
