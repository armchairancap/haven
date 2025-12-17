import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/common';
import { Download } from '@components/icons';
import SoundSelector from '@components/common/NotificationSoundSelector';

const DeveloperOptionsView = () => {
  const { t } = useTranslation();

  const exportLogs = useCallback(async () => {
    if (!window.logger) {
      throw new Error(t('Log file required'));
    }

    const filename = 'xxdk.log';
    const data = await window.logger.GetFile();
    const file = new Blob([data], { type: 'text/plain' });
    const a = document.createElement('a'),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }, [t]);

  return (
    <>
      <h2>{t('Developer Options')}</h2>
      <hr className='w-full my-10 border-charcoal-3' />
      <div className='space-y-12'>
        <div className='flex justify-between items-center'>
          <h3 className='headline--sm'>{t('Logs')}</h3>
          <Button className='text-center space-x-2' onClick={exportLogs}>
            <span>{t('Download')}</span>
            <Download className='inline w-5 h-5' />
          </Button>
        </div>
        <div className='flex justify-between items-center'>
          <h3 className='headline--sm'>{t('Notification Sound')}</h3>
          <div>
            <SoundSelector />
          </div>
        </div>
      </div>
    </>
  );
};

export default DeveloperOptionsView;
