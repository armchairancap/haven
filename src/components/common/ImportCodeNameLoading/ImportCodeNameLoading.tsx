import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Spinner } from 'src/components/common';
import { ProgressBar } from 'src/components/common';

type Props = {
  readyProgress: number;
  fullscreen?: boolean;
  statusText?: string;
};

const ImportCodeNameLoading: FC<Props> = ({ readyProgress, statusText }) => {
  const { t } = useTranslation();
  return (
    <div className='flex flex-col justify-center items-center h-screen w-screen'>
      <Spinner size='lg' />
      <ProgressBar completed={readyProgress}></ProgressBar>
      <div className='text-center'>
        <div className='headline--md'>
          {t('Securely setting up your codename. This could take a few minutes.')}
        </div>
        {statusText && (
          <div className='headline--sm mt-2 text-[var(--cyan)]'>
            {statusText}
          </div>
        )}
        <div className='headline--sm'>
          {t('Please do not close this page - your codename may be lost')}
        </div>
      </div>
    </div>
  );
};

export default ImportCodeNameLoading;
