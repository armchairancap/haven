import { useCallback, useMemo } from 'react';

import useKVStorage from './useKVStorage';

const KEY = 'channel-favorites';

const useChannelFavorites = () => {
  const [favoritesStr, setFavoritesStr, { loading }] = useKVStorage(KEY, '[]');

  const favorites = useMemo(() => {
    try {
      const parsed = JSON.parse(favoritesStr || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [favoritesStr]);

  const setFavorites = useCallback(
    async (newFavorites: string[]) => {
      await setFavoritesStr(JSON.stringify(newFavorites));
    },
    [setFavoritesStr]
  );

  const toggleFavorite = useCallback(
    (channelId: string) => {
      if (!loading) {
        setFavorites(
          favorites.includes(channelId)
            ? favorites.filter((id) => id !== channelId)
            : favorites.concat(channelId)
        );
      }
    },
    [favorites, loading, setFavorites]
  );

  const isFavorite = useCallback(
    (channelId?: string | null) => channelId && favorites.includes(channelId),
    [favorites]
  );

  return {
    loading,
    favorites,
    toggle: toggleFavorite,
    isFavorite
  };
};

export default useChannelFavorites;
