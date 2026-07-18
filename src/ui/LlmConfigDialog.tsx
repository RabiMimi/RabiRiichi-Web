import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LlmPromptTemplate, LlmProvider, type ILlmAiConfig } from '../proto';
import {
  loadLlmConfig,
  saveLlmConfig,
  clearLlmTokens,
} from '../lib/llmStorage';
import { formatError } from '../lib/errors';
import { Button } from './Button';
import { FORM, MODAL } from './styles';
import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from '../config/constants';

interface LlmConfigDialogProps {
  onClose: () => void;
  onSubmit: (config: ILlmAiConfig) => Promise<void>;
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  [LlmProvider.LLM_PROVIDER_GEMINI]: DEFAULT_GEMINI_MODEL,
  [LlmProvider.LLM_PROVIDER_OPENAI]: 'gpt-4o-mini',
  [LlmProvider.LLM_PROVIDER_UNSPECIFIED]: '',
};

export function LlmConfigDialog({
  onClose,
  onSubmit,
}: LlmConfigDialogProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const savedAll = loadLlmConfig();
  const initialProvider =
    savedAll.lastProvider &&
    (savedAll.lastProvider as LlmProvider) !==
      LlmProvider.LLM_PROVIDER_UNSPECIFIED
      ? savedAll.lastProvider
      : LlmProvider.LLM_PROVIDER_GEMINI;

  const [provider, setProvider] = useState<LlmProvider>(initialProvider);

  const savedProviderConfig = savedAll.byProvider[provider] ?? {};

  const [apiToken, setApiToken] = useState(savedProviderConfig.apiToken ?? '');

  const getNormalizedModel = (p: LlmProvider, m: string) => {
    if (p === LlmProvider.LLM_PROVIDER_GEMINI) {
      return GEMINI_MODELS.includes(m as any) ? m : DEFAULT_GEMINI_MODEL;
    }
    return m;
  };

  const [modelName, setModelName] = useState(() =>
    getNormalizedModel(
      provider,
      savedProviderConfig.model ?? DEFAULT_MODELS[provider],
    ),
  );
  const [language, setLanguage] = useState(
    savedProviderConfig.language ??
      (i18n.language.startsWith('zh')
        ? 'zhs'
        : i18n.language.startsWith('ja')
          ? 'ja'
          : 'en'),
  );
  const [displayName, setDisplayName] = useState(
    savedProviderConfig.displayName ?? '',
  );
  const [promptTemplate, setPromptTemplate] = useState<LlmPromptTemplate>(
    savedProviderConfig.promptTemplate ??
      LlmPromptTemplate.LLM_PROMPT_TEMPLATE_CUTE_JK,
  );
  const [baseUrl, setBaseUrl] = useState(savedProviderConfig.baseUrl ?? '');
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(savedProviderConfig.baseUrl),
  );

  const [showToken, setShowToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProviderChange = (newProvider: LlmProvider) => {
    setProvider(newProvider);
    const conf = loadLlmConfig().byProvider[newProvider] ?? {};
    setApiToken(conf.apiToken ?? '');
    const rawModel = conf.model ?? DEFAULT_MODELS[newProvider];
    setModelName(getNormalizedModel(newProvider, rawModel));
    setBaseUrl(conf.baseUrl ?? '');
    if (conf.displayName !== undefined) setDisplayName(conf.displayName);
    if (conf.language !== undefined) setLanguage(conf.language);
    setPromptTemplate(
      conf.promptTemplate ?? LlmPromptTemplate.LLM_PROMPT_TEMPLATE_CUTE_JK,
    );
    setErrorMsg(null);
  };

  const handleClearTokens = () => {
    clearLlmTokens();
    setApiToken('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedToken = apiToken.trim();
    if (!trimmedToken) {
      setErrorMsg(t('error.lobby.llm.config.token'));
      return;
    }

    const trimmedModel = modelName.trim();
    if (!trimmedModel) {
      setErrorMsg(t('error.lobby.llm.config.model'));
      return;
    }

    const config: ILlmAiConfig = {
      provider,
      apiToken: trimmedToken,
      model: trimmedModel,
      language,
      displayName: displayName.trim() !== '' ? displayName.trim() : null,
      baseUrl: baseUrl.trim() !== '' ? baseUrl.trim() : null,
      promptTemplate,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(config);
      saveLlmConfig(provider, {
        apiToken: trimmedToken,
        model: trimmedModel,
        language,
        displayName: displayName.trim(),
        baseUrl: baseUrl.trim(),
        promptTemplate,
      });
      onClose();
    } catch (err) {
      setErrorMsg(formatError(err, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className={MODAL.overlay}>
      <div className={`${MODAL.card} ${MODAL.cardDefaultLook} max-w-[480px]`}>
        <div className={MODAL.header}>
          <h2 className={MODAL.title}>{t('ai.llmConfig.title')}</h2>
          <button
            className={MODAL.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className={MODAL.body}
        >
          {errorMsg && <div className={FORM.error}>{errorMsg}</div>}

          {/* Provider & Model */}
          <div className="grid grid-cols-2 gap-4">
            {/* Provider */}
            <div className={FORM.group}>
              <label className={FORM.label}>{t('ai.llmConfig.provider')}</label>
              <select
                className={FORM.input}
                value={provider}
                onChange={(e) => handleProviderChange(Number(e.target.value))}
                disabled={isSubmitting}
              >
                <option value={LlmProvider.LLM_PROVIDER_GEMINI}>
                  {t('ai.provider.gemini')}
                </option>
                <option value={LlmProvider.LLM_PROVIDER_OPENAI}>
                  {t('ai.provider.openai')}
                </option>
              </select>
            </div>

            {/* Model */}
            <div className={FORM.group}>
              <label className={FORM.label}>{t('ai.llmConfig.model')}</label>
              {provider === LlmProvider.LLM_PROVIDER_GEMINI ? (
                <select
                  className={FORM.input}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  disabled={isSubmitting}
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className={FORM.input}
                  placeholder={DEFAULT_MODELS[provider]}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  disabled={isSubmitting}
                />
              )}
            </div>
          </div>

          {/* API Token */}
          <div className={FORM.group}>
            <label className={FORM.label}>{t('ai.llmConfig.apiToken')}</label>
            <div className="relative flex items-center">
              <input
                type={showToken ? 'text' : 'password'}
                className={`${FORM.input} w-full pr-16`}
                placeholder={t('ai.llmConfig.apiTokenPlaceholder')}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute right-2 text-xs text-[#82aaf0] hover:text-white bg-transparent border-none cursor-pointer"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken
                  ? t('ai.llmConfig.hideToken')
                  : t('ai.llmConfig.showToken')}
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div className={FORM.group}>
            <label className={FORM.label}>
              {t('ai.llmConfig.displayName')}
            </label>
            <input
              type="text"
              className={FORM.input}
              placeholder="e.g. Gemi狸"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Language & Persona */}
          <div className="grid grid-cols-2 gap-4">
            {/* Language */}
            <div className={FORM.group}>
              <label className={FORM.label}>{t('ai.llmConfig.language')}</label>
              <select
                className={FORM.input}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="zhs">{t('ai.llmConfig.langZhs')}</option>
                <option value="en">{t('ai.llmConfig.langEn')}</option>
                <option value="ja">{t('ai.llmConfig.langJa')}</option>
              </select>
            </div>

            {/* Prompt template (Persona) */}
            <div className={FORM.group}>
              <label className={FORM.label}>
                {t('ai.llmConfig.promptTemplate.label')}
              </label>
              <select
                className={FORM.input}
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(Number(e.target.value))}
                disabled={isSubmitting}
              >
                <option value={LlmPromptTemplate.LLM_PROMPT_TEMPLATE_CUTE_JK}>
                  {t('ai.llmConfig.promptTemplate.cuteJk')}
                </option>
                <option value={LlmPromptTemplate.LLM_PROMPT_TEMPLATE_MESUGAKI}>
                  {t('ai.llmConfig.promptTemplate.mesugaki')}
                </option>
              </select>
            </div>
          </div>

          {/* Advanced / Base URL */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="text-xs text-[#82aaf0] hover:underline bg-transparent border-none p-0 w-fit cursor-pointer text-left"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced
                ? t('ai.llmConfig.lessOptions')
                : t('ai.llmConfig.advancedOptions')}
            </button>
            {showAdvanced && (
              <div className={FORM.group}>
                <label className={FORM.label}>
                  {t('ai.llmConfig.baseUrl')}
                </label>
                <input
                  type="text"
                  className={FORM.input}
                  placeholder="https://api.openai.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <Button
              variant="secondary"
              size="compact"
              onClick={handleClearTokens}
              disabled={isSubmitting}
              type="button"
            >
              {t('ai.llmConfig.forgetTokens')}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
                type="button"
              >
                {t('ai.llmConfig.cancel')}
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('ai.llmConfig.connecting')}
                  </span>
                ) : (
                  t('ai.llmConfig.add')
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
