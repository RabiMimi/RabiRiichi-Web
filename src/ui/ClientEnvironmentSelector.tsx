import { useTranslation } from 'react-i18next';
import {
  CLIENT_ORIGINS,
  getClientEnvironment,
  getClientUrl,
  type ClientEnvironment,
} from '../config/clientEnvironments';

interface ClientEnvironmentSelectorProps {
  disabled?: boolean;
  onSwitch: () => void;
}

export function ClientEnvironmentSelector({
  disabled = false,
  onSwitch,
}: ClientEnvironmentSelectorProps): React.JSX.Element {
  const { t } = useTranslation();
  const current = getClientEnvironment(window.location.origin);

  return (
    <nav
      aria-label={t('client.environment')}
      className="flex flex-wrap items-center gap-1 text-xs"
    >
      <span className="mr-1 text-white/50">{t('client.environment')}</span>
      {(Object.keys(CLIENT_ORIGINS) as ClientEnvironment[]).map(
        (environment) => (
          <a
            key={environment}
            href={getClientUrl(environment)}
            aria-current={current === environment ? 'page' : undefined}
            aria-disabled={disabled || current === environment}
            onClick={(clickEvent) => {
              if (disabled || current === environment) {
                clickEvent.preventDefault();
                return;
              }
              if (
                clickEvent.metaKey ||
                clickEvent.ctrlKey ||
                clickEvent.shiftKey ||
                clickEvent.altKey
              )
                return;
              onSwitch();
            }}
            className={`rounded-md border px-2.5 py-1.5 transition-colors ${
              current === environment
                ? 'border-[#ff7a99]/60 bg-[#ff7a99]/10 text-[#ff7a99]'
                : 'border-white/15 text-white/70 hover:border-[#ff7a99] hover:text-white'
            } ${disabled ? 'pointer-events-none opacity-40' : ''}`}
          >
            {t(`client.${environment}`)}
          </a>
        ),
      )}
    </nav>
  );
}
