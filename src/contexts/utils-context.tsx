import type { CMix, DummyTraffic, RawCipher, WithChildren } from 'src/types';
import type { ChannelManager } from './network-client-context';
import type { DMClient } from 'src/types';

import React, { FC, useCallback, useState } from 'react';
import { decoder } from 'src/utils/index';
import Loading from 'src/components/views/LoadingView';
import { identityDecoder } from 'src/utils/decoders';
import { ChannelEventHandler, DMEventHandler } from 'src/events';
import { WebAssemblyRunner } from 'src/components/common';
import { useTranslation } from 'react-i18next';
import { PrivacyLevel } from 'src/types';
import { CMIX_INITIALIZATION_KEY } from 'src/constants';
import { clearKVStorage } from 'src/hooks/useKVStorage';

export type ChannelManagerCallbacks = {
  EventUpdate: ChannelEventHandler;
};

export type DMClientEventCallback = {
  EventUpdate: DMEventHandler;
};

export type Notifications = {
  AddToken: (newToken: string, app: string) => void;
  RemoveToken: () => void;
  SetMaxState: (maxState: number) => void;
  GetMaxState: () => number;
  GetID: () => number;
};

export type XXDKUtils = {
  NewCmix: (
    ndf: string,
    storageDir: string,
    password: Uint8Array,
    registrationCode: string
  ) => Promise<void>;
  LoadCmix: (
    storageDirectory: string,
    password: Uint8Array,
    cmixParams: Uint8Array
  ) => Promise<CMix>;
  LoadNotifications: (cmixId: number) => Promise<Notifications>;
  LoadNotificationsDummy: (cmixId: number) => Promise<Notifications>;
  GetDefaultCMixParams: () => Uint8Array;
  GetChannelInfo: (prettyPrint: string) => Promise<Uint8Array>;
  Base64ToUint8Array: (base64: string) => Promise<Uint8Array>;
  GenerateChannelIdentity: (cmixId: number) => Promise<Uint8Array>;
  NewChannelsManagerWithIndexedDb: (
    cmixId: number,
    wasmJsPath: string,
    privateIdentity: Uint8Array,
    extensionBuilderIDsJSON: Uint8Array,
    notificationsId: number,
    callbacks: ChannelManagerCallbacks,
    channelDbCipher: number
  ) => Promise<ChannelManager>;
  NewDMClientWithIndexedDb: (
    cmixId: number,
    notificationsId: number,
    cipherId: number,
    wasmJsPath: string,
    privateIdentity: Uint8Array,
    eventCallback: DMClientEventCallback
  ) => Promise<DMClient>;
  NewDatabaseCipher: (
    cmixId: number,
    storagePassword: Uint8Array,
    payloadMaximumSize: number
  ) => Promise<RawCipher>;
  LoadChannelsManagerWithIndexedDb: (
    cmixId: number,
    wasmJsPath: string,
    storageTag: string,
    extensionBuilderIDsJSON: Uint8Array,
    notificationsId: number,
    callbacks: ChannelManagerCallbacks,
    channelDbCipher: number
  ) => Promise<ChannelManager>;
  GetPublicChannelIdentityFromPrivate: (privateKey: Uint8Array) => Promise<Uint8Array>;
  IsNicknameValid: (nickname: string) => Promise<null>;
  GetShareUrlType: (url: string) => Promise<PrivacyLevel>;
  GetVersion: () => Promise<Uint8Array>;
  GetClientVersion: () => Promise<string>;
  GetOrInitPassword: (password: string) => Promise<Uint8Array>;
  ImportPrivateIdentity: (password: string, privateIdentity: Uint8Array) => Promise<Uint8Array>;
  ConstructIdentity: (publicKey: Uint8Array, codesetVersion: number) => Promise<Uint8Array>;
  DecodePrivateURL: (url: string, password: string) => Promise<string>;
  DecodePublicURL: (url: string) => Promise<string>;
  GetChannelJSON: (prettyPrint: string) => Promise<Uint8Array>;
  NewDummyTrafficManager: (
    cmixId: number,
    maximumOfMessagesPerCycle: number,
    durationToWaitBetweenSendsMilliseconds: number,
    upperBoundIntervalBetweenCyclesMilliseconds: number
  ) => Promise<DummyTraffic>;
  GetWasmSemanticVersion: () => Promise<Uint8Array>;
  Purge: (userPassword: string) => Promise<void>;
  ValidForever: () => Promise<number>;
};

const initialUtils = {
  shouldRenderImportCodeNameScreen: false
} as unknown as XXDKUtils;

export type XXDKContext = {
  utils: XXDKUtils;
  setUtils: (utils: XXDKUtils) => void;
  utilsLoaded: boolean;
  setUtilsLoaded: (loaded: boolean) => void;
  getCodeNameAndColor: (publicKey: string, codeset: number) => Promise<{ codename: string; color: string }>;
};

export const UtilsContext = React.createContext<XXDKContext>({
  utils: initialUtils,
  utilsLoaded: false,
  shouldRenderImportCodeNameScreen: false
} as unknown as XXDKContext);

UtilsContext.displayName = 'UtilsContext';

export type IdentityJSON = {
  PubKey: string;
  Codename: string;
  Color: string;
  Extension: string;
  CodesetVersion: number;
};

// Clear the storage in case a half assed registration was made
if (typeof window !== 'undefined' && localStorage.getItem(CMIX_INITIALIZATION_KEY) === 'false') {
  localStorage.clear();
  // Also clear KV storage asynchronously
  clearKVStorage().catch((e) => console.error('Failed to clear KV storage:', e));
}

export const UtilsProvider: FC<WithChildren> = ({ children }) => {
  const { t } = useTranslation();
  const [utils, setUtils] = useState<XXDKUtils>();
  const [utilsLoaded, setUtilsLoaded] = useState<boolean>(false);

  const getCodeNameAndColor = useCallback(
    async (publicKey: string, codeset: number) => {
      if (!utils || !utils.ConstructIdentity || !utils.Base64ToUint8Array) {
        console.warn('Utils not ready for getCodeNameAndColor', { utils: !!utils, ConstructIdentity: !!utils?.ConstructIdentity, Base64ToUint8Array: !!utils?.Base64ToUint8Array });
        return { codename: '', color: 'var(--text-primary)' };
      }

      let pubkeyUintArray: Uint8Array;
      try {
        pubkeyUintArray = await utils.Base64ToUint8Array(publicKey);
      } catch (e) {
        const msg = `Invalid public key: ${publicKey}: ${e}`;
        console.error(msg);
        throw new Error(msg);
      }

      try {
        const constructedIdentity = await utils.ConstructIdentity(pubkeyUintArray, codeset);
        const identityJson = identityDecoder(
          JSON.parse(decoder.decode(constructedIdentity))
        );

        return {
          codename: identityJson.codename,
          color: identityJson.color.replace('0x', '#')
        };
      } catch (e) {
        const msg = `Failed to construct identity from: ${JSON.stringify({ publicKey, codeset })}: ${e}`;
        console.error(msg);
        throw new Error(msg);
      }
    },
    [utils]
  );

  return (
    <UtilsContext.Provider
      value={{
        utils: utils as XXDKUtils,
        setUtils,
        utilsLoaded,
        setUtilsLoaded,
        getCodeNameAndColor
      }}
    >
      <WebAssemblyRunner>
        {utils ? children : <Loading message={t('Loading XXDK...')} />}
      </WebAssemblyRunner>
    </UtilsContext.Provider>
  );
};

export const useUtils = () => {
  const context = React.useContext(UtilsContext);

  if (context === undefined) {
    throw new Error('useUtils must be used within a UtilsProvider');
  }

  return context;
};
