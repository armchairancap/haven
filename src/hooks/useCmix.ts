import type { CMix, CMixParams, DatabaseCipher, DummyTraffic } from 'src/types';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useUtils } from '@contexts/utils-context';
import { encoder, decoder } from '@utils/index';
import {
  DUMMY_TRAFFIC_ARGS,
  FOLLOWER_TIMEOUT_PERIOD,
  MAXIMUM_PAYLOAD_BLOCK_SIZE,
  STATE_PATH
} from 'src/constants';
import useTrackNetworkPeriod from './useNetworkTrackPeriod';
import { useAuthentication } from '@contexts/authentication-context';
import { AppEvents, appBus as bus, useAppEventListener } from 'src/events';
import useAccountSync, { AccountSyncStatus } from './useAccountSync';
import { clearKVStorage } from './useKVStorage';

import { GetDefaultNDF } from 'xxdk-wasm';

export enum NetworkStatus {
  UNINITIALIZED = 'uninitialized',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  FAILED = 'failed'
}

export enum InitState {
  UNINITIALIZED = 0,
  NEWCMIX = 1,
  NEWCMIXCOMPLETED = 2,
  LOADCMIX = 3,
  LOADCMIXCOMPLETED = 4
}

const ndf = GetDefaultNDF();

const useCmix = () => {
  const [initState, setInitState] = useState<InitState>(InitState.UNINITIALIZED);
  const { cmixPreviouslyInitialized, rawPassword } = useAuthentication();
  const [status, setStatus] = useState<NetworkStatus>(NetworkStatus.UNINITIALIZED);
  const [dummyTraffic, setDummyTrafficManager] = useState<DummyTraffic>();
  const [cmix, setCmix] = useState<CMix | undefined>();
  const { utils } = useUtils();
  const cmixId = useMemo(() => cmix?.GetID(), [cmix]);
  const [databaseCipher, setDatabaseCipher] = useState<DatabaseCipher>();
  const { trackingMs } = useTrackNetworkPeriod();
  const [decryptedPass, setDecryptedPass] = useState<Uint8Array>();
  const accountSync = useAccountSync();

  const encodedCmixParams = useMemo(() => {
    if (!utils?.GetDefaultCMixParams) return new Uint8Array();
    const params = JSON.parse(decoder.decode(utils.GetDefaultCMixParams())) as CMixParams;
    params.Network.EnableImmediateSending = true;
    return encoder.encode(JSON.stringify(params));
  }, [utils]);

  const createDatabaseCipher = useCallback(
    async (id: number, password: Uint8Array) => {
      const cipher = await utils.NewDatabaseCipher(id, password, MAXIMUM_PAYLOAD_BLOCK_SIZE);

      setDatabaseCipher({
        id: cipher.GetID(),
        decrypt: async (encrypted: string) => decoder.decode(await cipher.Decrypt(encrypted))
      });
    },
    [utils]
  );

  useEffect(() => {
    if (cmix) {
      bus.emit(AppEvents.CMIX_LOADED, cmix);
    }
  }, [cmix]);

  const connect = useCallback(async () => {
    if (!cmix) {
      throw Error('Cmix required');
    }

    setStatus(NetworkStatus.CONNECTING);
    try {
      cmix.StartNetworkFollower(FOLLOWER_TIMEOUT_PERIOD);
    } catch (error) {
      console.error('Error while StartNetworkFollower:', error);
      setStatus(NetworkStatus.FAILED);
    }

    try {
      await cmix.WaitForNetwork(10 * 60 * 1000);
      setStatus(NetworkStatus.CONNECTED);
    } catch (e) {
      console.error('Timed out. Network is not healthy.');
      setStatus(NetworkStatus.FAILED);
    }
  }, [cmix]);

  const disconnect = useCallback(() => {
    dummyTraffic?.Pause();
    setDummyTrafficManager(undefined);
    cmix?.StopNetworkFollower();
    setStatus(NetworkStatus.DISCONNECTED);
    setCmix(undefined);
  }, [cmix, dummyTraffic]);

  useEffect(() => {
    if (cmix) {
      cmix.AddHealthCallback({
        Callback: (isHealthy: boolean) => {
          if (isHealthy) {
            setStatus(NetworkStatus.CONNECTED);
          } else {
            setStatus(NetworkStatus.DISCONNECTED);
          }
        }
      });
    }
  }, [cmix]);


  useEffect(() => {
    if (cmix) {
      connect();
    }
  }, [connect, cmix]);

  useEffect(() => {
    if (status === NetworkStatus.CONNECTED && dummyTraffic && !dummyTraffic.GetStatus()) {
      dummyTraffic.Start();
    }
  }, [dummyTraffic, status]);

  useEffect(() => {
    if (cmixId !== undefined) {
      utils.NewDummyTrafficManager(cmixId, ...DUMMY_TRAFFIC_ARGS)
        .then(setDummyTrafficManager)
        .catch((error) => {
          console.error('error while creating the Dummy Traffic Object:', error);
        });
    }
  }, [cmixId, utils]);

  useEffect(() => {
    if (cmix && status === NetworkStatus.CONNECTED) {
      cmix.SetTrackNetworkPeriod(trackingMs);
    }
  }, [cmix, status, trackingMs]);

  useEffect(() => {
    if (decryptedPass && cmix) {
      createDatabaseCipher(cmix.GetID(), decryptedPass);
    }
  }, [cmix, createDatabaseCipher, decryptedPass]);

  // Clear all storage (IndexedDB and localStorage related to cmix/channels/dms)
  const clearAllStorage = async () => {
    console.log('Clearing all storage before NewCmix...');

    try {
      // Clear localStorage
      console.log('Clearing localStorage...');
      localStorage.clear();
      console.log('localStorage cleared');

      // Clear KV storage (IndexedDB-backed)
      console.log('Clearing KV storage...');
      await clearKVStorage();
      console.log('KV storage cleared');

      // Don't try to enumerate databases (can hang if other tabs have connections open)
      // Instead, just clear localStorage and let NewCmix/LoadCmix handle the rest
      // The state worker will recreate/overwrite IndexedDB as needed
      console.log('Skipping IndexedDB enumeration (may hang if other tabs are open)');
      console.log('WASM workers will handle IndexedDB initialization');

      console.log('Storage cleared successfully');
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  };

  // Cmix initialization and loading
  const initializeCmix = async (password: Uint8Array) => {
    if (!cmixPreviouslyInitialized) {
      // Clear all storage before creating new cmix to avoid conflicts
      await clearAllStorage();
      console.log('Calling NewCmix with STATE_PATH:', STATE_PATH);
      console.log('NDF length:', ndf?.length);
      try {
        await utils.NewCmix(ndf, STATE_PATH, password, '');
        console.log('NewCmix completed successfully');
      } catch (error) {
        console.error('NewCmix failed:', error);
        throw error;
      }
    } else {
      console.log('Skipping NewCmix - cmix previously initialized');
    }
  };
  const loadCmix = async (password: Uint8Array) => {
    console.log('Loading cmix from STATE_PATH:', STATE_PATH);
    try {
      const loadedCmix = await utils.LoadCmix(STATE_PATH, password, encodedCmixParams);
      console.log('LoadCmix completed, setting cmix');
      setCmix(loadedCmix);
    } catch (error) {
      console.error('LoadCmix failed:', error);
      throw error;
    }
  };
  useEffect(() => {
    if (decryptedPass) {
      console.log('Starting cmix initialization/load sequence');
      initializeCmix(decryptedPass)
        .then(() => {
          console.log('InitializeCmix complete, proceeding to loadCmix');
          return loadCmix(decryptedPass);
        })
        .catch((error) => {
          console.error('Error initializing/loading CMix:', error);
          setStatus(NetworkStatus.FAILED);
        });
    }
  }, [decryptedPass]);

  const onPasswordDecryption = useCallback(
    async (password: Uint8Array) => {
      setDecryptedPass(password);
    },
    [accountSync.status]
  );

  useAppEventListener(AppEvents.PASSWORD_DECRYPTED, onPasswordDecryption);

  return {
    connect,
    cmix,
    cipher: databaseCipher,
    disconnect,
    id: cmixId,
    status
  };
};

export default useCmix;
