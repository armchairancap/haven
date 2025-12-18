import { getKVStore, setKVValue } from 'src/hooks/useKVStorage';
import {
  CMIX_INITIALIZATION_KEY,
  DMS_DATABASE_NAME,
  ACCOUNT_SYNC,
  ACCOUNT_SYNC_SERVICE
} from 'src/constants';

// All localStorage keys that should be migrated to KV storage
const KEYS_TO_MIGRATE = [
  // From constants
  CMIX_INITIALIZATION_KEY,  // 'cmixPreviouslyInitialized'
  DMS_DATABASE_NAME,        // 'DMS_DATABASE_NAME'
  ACCOUNT_SYNC,             // 'ACCOUNT_SYNC'
  ACCOUNT_SYNC_SERVICE,     // 'ACCOUNT_SYNC_SERVICE'
  // Direct localStorage keys
  'prettyprints',
  'version',
  'spacesFirstLoad',
  'TRACK_NETWORK_PERIOD',
  'notification-permission',
];

// Key to track if migration has been completed
const MIGRATION_COMPLETED_KEY = '__kv_migration_completed__';

/**
 * Check if migration has already been completed
 */
function isMigrationCompleted(): boolean {
  try {
    return localStorage.getItem(MIGRATION_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted(): void {
  try {
    localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');
  } catch {
    // Ignore errors
  }
}

/**
 * Migrate all localStorage keys to KV storage.
 * This should be called once on app startup.
 * After migration, the localStorage keys are removed.
 */
export async function migrateLocalStorageToKV(): Promise<void> {
  // Skip if already migrated
  if (isMigrationCompleted()) {
    console.log('[Migration] Already completed, skipping');
    return;
  }

  console.log('[Migration] Starting localStorage to KV migration...');

  // Ensure KV store is initialized
  const store = await getKVStore();

  let migratedCount = 0;

  for (const key of KEYS_TO_MIGRATE) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        // Check if already exists in KV (don't overwrite)
        try {
          await store.Get(key);
          // Key exists in KV, skip migration for this key
          console.log(`[Migration] Key "${key}" already exists in KV, skipping`);
        } catch {
          // Key doesn't exist in KV, migrate it
          // Store the raw string value directly (already JSON-stringified from localStorage)
          await store.Set(key, value);
          console.log(`[Migration] Migrated "${key}"`);
          migratedCount++;
        }

        // Remove from localStorage after migration
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.error(`[Migration] Failed to migrate "${key}":`, err);
    }
  }

  // Mark migration as completed
  markMigrationCompleted();

  console.log(`[Migration] Complete. Migrated ${migratedCount} keys.`);
}

export default migrateLocalStorageToKV;
