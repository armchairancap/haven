import { createContext, FC, useContext, useState } from 'react';
import useKVStorage from 'src/hooks/useKVStorage';
import NotificationSound from '@components/common/NotificationSound';

type SoundContextType = {
  playNotification: (() => void) | null;
};

const SoundContext = createContext<SoundContextType>({ playNotification: null });

export const SoundProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playNotification, setPlayNotification] = useState<(() => void) | null>(null);
  const [notificationSound] = useKVStorage('notification-sound', '/sounds/notification.mp3');

  return (
    <SoundContext.Provider value={{ playNotification }}>
      <NotificationSound soundUrl={notificationSound ?? ''} onInit={setPlayNotification} />
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);
