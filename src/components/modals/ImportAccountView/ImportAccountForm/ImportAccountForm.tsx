import React, { FC, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Checkmark } from 'src/components/icons';
import { Button, Spinner } from 'src/components/common';

type Props = {
  onSubmit: (value: { password: string; identity: string }) => Promise<void>;
};

const ImportAccountForm: FC<Props> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState<string>('');
  const [privateIdentity, setPrivateIdentity] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const lastUrlRef = useRef<string>('');

  const handleSubmission = useCallback(
    async (evt: React.FormEvent<HTMLFormElement>) => {
      evt.preventDefault();
      if (!privateIdentity) {
        setError(t('Please provide an identity file or URL'));
        return;
      }
      try {
        await onSubmit({ password, identity: privateIdentity });
      } catch (e) {
        setError(t('Incorrect file and/or password'));
      }
    },
    [t, onSubmit, password, privateIdentity]
  );

  const fetchIdentityFromUrl = useCallback(async (url: string) => {
    lastUrlRef.current = url;
    setIsLoading(true);
    try {
      const response = await fetch(url);
      if (lastUrlRef.current !== url) return;
      if (response.ok) {
        const text = await response.text();
        setPrivateIdentity(text);
        setError('');
      } else {
        setPrivateIdentity('');
      }
    } catch (e) {
      if (lastUrlRef.current !== url) return;
      setPrivateIdentity('');
    } finally {
      if (lastUrlRef.current === url) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value.match(/^https?:\/\//)) {
      fetchIdentityFromUrl(value);
    } else {
      setPrivateIdentity('');
    }
  }, [fetchIdentityFromUrl]);

  const onFileChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>((e) => {
    const targetFile = e.target.files?.[0];

    if (targetFile && targetFile.name) {
      setInputValue(targetFile.name);
    }
    if (targetFile) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const fileContent = evt?.target?.result;
        setPrivateIdentity(fileContent?.toString() ?? '');
        setError('');
      };
      reader.readAsText(targetFile);
    }
  }, []);

  return (
    <form className='w-full flex flex-col items-center min-h-[476px]' onSubmit={handleSubmission}>
      <h2 className='mt-9 mb-4'>{t('Import your account')}</h2>
      <p className='mb-8 font-medium text-xs leading-tight text-cyan max-w-[520px] text-left w-full'>
        {t(`Note that importing your account will only restore your codename. You
        need to rejoin manually any previously joined channel`)}
      </p>
      {error && <div className='text-xs mt-2 text-red'>{error}</div>}
      <input
        id='identityFile'
        type='file'
        onChange={onFileChange}
        className='hidden'
      />
      <div className='
          flex justify-between items-center
          bg-dark-5
          w-full max-w-[520px] h-[55px]
          rounded mb-[26px]
          overflow-hidden
        '>
        <input 
            type="text" 
            placeholder={t('Paste URL or choose a file')}
            value={inputValue}
            onChange={handleInputChange}
            className='
                border-none outline-none
                bg-transparent px-2.5 py-[18px]
                text-text-primary text-sm
                w-full h-full
            '
        />
        {isLoading && (
          <div className='px-3 flex items-center justify-center'>
            <Spinner size='sm' className='text-primary' />
          </div>
        )}
        {!isLoading && privateIdentity && (
          <div className='px-3 flex items-center justify-center text-primary'>
            <Checkmark width={24} height={24} />
          </div>
        )}
        <label
            htmlFor='identityFile'
            className='cursor-pointer px-3 h-full flex items-center justify-center hover:bg-dark-4 transition-colors'
            title={t('Upload file')}
        >
            <Upload />
        </label>
      </div>
      <input
        required
        type='password'
        placeholder={t('Unlock export with your password')}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        className='
          border-none outline-none
          bg-dark-5 px-2.5 py-[18px]
          text-text-primary text-sm
          w-full max-w-[520px] h-[55px]
          rounded mb-[26px]
        '
      />
      <Button type='submit' className='mt-5 text-black mb-30'>
        {t('Import')}
      </Button>
    </form>
  );
};

export default ImportAccountForm;
