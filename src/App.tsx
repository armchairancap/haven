import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useTranslation } from 'react-i18next';
import store from './store';
import { ManagedUIContext } from 'src/contexts/ui-context';
import { ManagedNetworkContext } from 'src/contexts/network-client-context';
import { AuthenticationProvider } from 'src/contexts/authentication-context';
import { UtilsProvider } from 'src/contexts/utils-context';
import { DBProvider } from 'src/contexts/db-context';
import { DMContextProvider } from 'src/contexts/dm-client-context';
import './i18n';
import ErrorBoundary from 'src/components/common/ErrorBoundary';
import { Helmet } from 'react-helmet-async';
import { SoundProvider } from 'src/contexts/sound-context';
import { migrateLocalStorageToKV } from 'src/utils/migrateLocalStorage';

const Providers = ({ children }: { children: React.ReactNode }) => (
  <DBProvider>
    <Provider store={store}>
      <UtilsProvider>
        <AuthenticationProvider>
          <DMContextProvider>
            <ManagedNetworkContext>
              <SoundProvider>
                <ManagedUIContext>{children}</ManagedUIContext>
              </SoundProvider>
            </ManagedNetworkContext>
          </DMContextProvider>
        </AuthenticationProvider>
      </UtilsProvider>
    </Provider>
  </DBProvider>
);

const App = () => {
  const { t } = useTranslation();
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Run localStorage to KV migration on app load, blocking until complete
  useEffect(() => {
    migrateLocalStorageToKV()
      .then(() => setMigrationComplete(true))
      .catch((e) => {
        console.error('[App] Migration failed:', e);
        // Continue anyway to avoid blocking the app entirely
        setMigrationComplete(true);
      });
  }, []);

  // Block rendering until migration completes to prevent race conditions
  // with providers reading from KV storage before migration finishes
  if (!migrationComplete) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{t('internet haven')}</title>
        <link rel='icon' href='/favicon.svg' />
      </Helmet>
      <ErrorBoundary>
        <Providers>
          <Outlet />
        </Providers>
      </ErrorBoundary>
      <div id='emoji-portal' />
    </>
  );
};

export default App;
