import { useTranslation } from 'react-i18next';
import { CLIENT_DOWNLOAD_URL } from '../config/clientEnvironments';
import { IconButton } from './IconButton';
import { Tooltip } from './Tooltip';

export function ClientDownloadButton(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Tooltip content={t('client.download')} position="bottom">
      <IconButton
        as="a"
        variant="client"
        href={CLIENT_DOWNLOAD_URL}
        aria-label={t('client.download')}
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" />
        </svg>
      </IconButton>
    </Tooltip>
  );
}
