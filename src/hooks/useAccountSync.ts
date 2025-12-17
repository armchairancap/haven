import { ACCOUNT_SYNC, ACCOUNT_SYNC_SERVICE } from 'src/constants';
import useKVStorage from './useKVStorage';
import { useMemo } from 'react';

export enum AccountSyncStatus {
  NotSynced = 'NotSynced',
  Synced = 'Synced',
  Ignore = 'Ignored'
}

export enum AccountSyncService {
  None = 'None',
  Google = 'Google',
  Dropbox = 'Dropbox'
}

const NOT_SYNCED_STATUSES = [AccountSyncStatus.NotSynced, AccountSyncStatus.Ignore];

const useAccountSync = () => {
  const [status, setStatus] = useKVStorage(ACCOUNT_SYNC, AccountSyncStatus.NotSynced);
  const [service, setService] = useKVStorage(ACCOUNT_SYNC_SERVICE, AccountSyncService.None);

  const isSynced = useMemo(
    () => status !== null && !NOT_SYNCED_STATUSES.includes(status as AccountSyncStatus),
    [status]
  );

  return {
    status,
    setStatus,
    service,
    setService,
    isSynced
  };
};

export default useAccountSync;
