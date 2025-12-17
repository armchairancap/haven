import { useState, useEffect, useCallback, useRef } from 'react';
import { createKVStore } from 'xxdk-wasm';
import { STATE_PATH } from 'src/constants';

// KVStore interface (string-only, matching xxdk-wasm)
export interface KVStore {
  Get(key: string): Promise<string>;
  Set(key: string, value: string): Promise<void>;
  Delete(key: string): Promise<void>;
  Keys(): Promise<string[]>;
  Clear(): Promise<void>;
}

// Global KV store instance (lazy initialized)
let kvStorePromise: Promise<KVStore> | null = null;
let kvStoreInstance: KVStore | null = null;

/**
 * Get or create the global KV store instance
 */
export async function getKVStore(): Promise<KVStore> {
  if (kvStoreInstance) {
    return kvStoreInstance;
  }

  if (!kvStorePromise) {
    kvStorePromise = createKVStore(STATE_PATH).then((store: KVStore) => {
      kvStoreInstance = store;
      return store;
    });
  }

  return kvStorePromise!;
}

/**
 * Clear all KV storage (for logout/reset)
 */
export async function clearKVStorage(): Promise<void> {
  const store = await getKVStore();
  await store.Clear();
}

/**
 * Get a value from KV storage
 */
export async function getKVValue<T>(key: string): Promise<T | null> {
  try {
    const store = await getKVStore();
    return await store.Get(key) as T;
  } catch {
    // Key doesn't exist
    return null;
  }
}

/**
 * Set a value in KV storage
 */
export async function setKVValue(key: string, value: string): Promise<void> {
  const store = await getKVStore();
  await store.Set(key, value);
}

/**
 * Delete a value from KV storage
 */
export async function deleteKVValue(key: string): Promise<void> {
  const store = await getKVStore();
  await store.Delete(key);
}

/**
 * React hook for KV storage (string values only).
 * Similar API to useLocalStorage but async.
 *
 * NOTE: If the key doesn't exist in storage, the defaultValue will be
 * written to storage automatically. This is a side effect on first read.
 *
 * @param key - The key to store the value under
 * @param defaultValue - Default value if key doesn't exist (will be written to storage)
 * @returns [value, setValue, { loading, error }]
 */
function useKVStorage(
  key: string,
  defaultValue: string
): [string, (value: string) => Promise<void>, { loading: boolean; error: Error | null }] {
  const [value, setValueState] = useState<string>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  // Store defaultValue in ref to avoid re-running effect when it changes
  const defaultValueRef = useRef(defaultValue);

  // Load initial value
  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        const stored = await getKVValue<string>(key);
        if (mountedRef.current) {
          if (stored !== null) {
            setValueState(stored);
          } else {
            // Set default value in storage
            await setKVValue(key, defaultValueRef.current);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [key]); // Removed defaultValue from deps - use ref instead

  // Set value function
  const setValue = useCallback(async (newValue: string) => {
    try {
      await setKVValue(key, newValue);
      if (mountedRef.current) {
        setValueState(newValue);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    }
  }, [key]);

  return [value, setValue, { loading, error }];
}

export default useKVStorage;
