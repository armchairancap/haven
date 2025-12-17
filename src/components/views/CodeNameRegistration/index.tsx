import { FC, useState, useEffect, useCallback } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

import { Button, ImportCodeNameLoading } from 'src/components/common';
import { useNetworkClient } from 'src/contexts/network-client-context';
import { Spinner } from 'src/components/common';

import Identity from 'src/components/common/Identity';
import { AMOUNT_OF_IDENTITIES_TO_GENERATE } from 'src/constants';
import { useAuthentication } from '@contexts/authentication-context';

type Props = {
  password: string;
};

const CodenameRegistration: FC<Props> = ({ password }) => {
  const { t } = useTranslation();
  const { getOrInitPassword, setIsAuthenticated } = useAuthentication();
  const { checkRegistrationReadiness, cmix, generateIdentities } = useNetworkClient();
  const [loading, setLoading] = useState(false);
  const [identities, setIdentites] = useState<Awaited<ReturnType<typeof generateIdentities>>>([]);
  const [selectedCodeName, setSelectedCodeName] = useState('');
  const [selectedPrivateIdentity, setSelectedPrivateIdentity] = useState<Uint8Array>();
  const [firstTimeGenerated, setFirstTimeGenerated] = useState(false);

  const [readyProgress, setReadyProgress] = useState<number>(0);
  const [registrationStatus, setRegistrationStatus] = useState<string>('');

  useEffect(() => {
    getOrInitPassword(password);
  }, [getOrInitPassword, password]);

  useEffect(() => {
    if (!firstTimeGenerated && cmix) {
      generateIdentities(20).then(setIdentites);
      setFirstTimeGenerated(true);
    }
  }, [firstTimeGenerated, generateIdentities, cmix]);

  const register = useCallback(async () => {
    setLoading(true);
    setTimeout(async () => {
      if (selectedPrivateIdentity) {
        checkRegistrationReadiness(selectedPrivateIdentity, (registeredNodes, totalNodes) => {
          // Calculate progress as percentage
          const progress = totalNodes > 0 ? Math.ceil((registeredNodes / totalNodes) * 100) : 0;
          setReadyProgress(progress);
          setRegistrationStatus(`${registeredNodes}/${totalNodes} nodes registered`);

          // The checkRegistrationReadiness will handle completion automatically
        });
      }
    }, 500);
  }, [checkRegistrationReadiness, selectedPrivateIdentity]);

  return loading ? (
    <ImportCodeNameLoading fullscreen readyProgress={readyProgress} statusText={registrationStatus} />
  ) : (
    <div className='w-full flex flex-col justify-center items-center px-6'>
      <h2 data-testid='codename-registration-title' className='mt-9 mb-4'>
        {t('Find your Codename')}
      </h2>
      <p className='mb-8 text-sm text-[var(--cyan)] leading-[18px] font-medium max-w-[800px] text-center'>
        <span>
          {t(`
            Codenames are generated on your computer by you. No servers or
            databases are involved at all.
          `)}
        </span>
        <br />
        <span>
          {t(`
            Your Codename is your personally owned anonymous identity shared
            across every Haven Chat you join. It is private and it can never be
            traced back to you.
          `)}
        </span>
      </p>

      {identities.length ? (
        <div
          data-testid='codename-registration-options'
          className='min-w-[85%] grid sm:grid-cols-2 lg:grid-cols-4 md:grid-cols-3 gap-x-4 gap-y-6 overflow-auto'
        >
          {identities.map((i) => (
            <div
              key={i.codename}
              className={cn(
                'overflow-auto md:overflow-hidden rounded-xl bg-charcoal-4 cursor-pointer p-4',
                i.codename === selectedCodeName ? 'ring-2 ring-cyan' : ''
              )}
              onClick={() => {
                setSelectedCodeName(i.codename);
                setSelectedPrivateIdentity(i.privateIdentity);
              }}
            >
              <span className='text-xs'>
                <Identity {...i} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className='w-full h-64 flex justify-center items-center'>
          <Spinner size='lg' />
        </div>
      )}

      <div className='flex mb-5 mt-12 gap-4'>
        <Button
          variant='outlined'
          data-testid='discover-more-button'
          className='disabled:opacity-50 disabled:cursor-not-allowed'
          onClick={() => {
            setSelectedCodeName('');
            generateIdentities(AMOUNT_OF_IDENTITIES_TO_GENERATE).then(setIdentites);
          }}
          disabled={!cmix}
        >
          {t('Discover More')}
        </Button>
        <Button
          data-testid='claim-codename-button'
          onClick={register}
          disabled={!cmix || selectedCodeName.length === 0}
          className='disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {t('Claim')}
        </Button>
      </div>
    </div>
  );
};

export default CodenameRegistration;
