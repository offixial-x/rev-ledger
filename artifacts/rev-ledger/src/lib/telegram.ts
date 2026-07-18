declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        CloudStorage: {
          getItem: (key: string, callback: (error: unknown, value: string) => void) => void;
          setItem: (key: string, value: string, callback?: (error: unknown, success: boolean) => void) => void;
          removeItem: (key: string, callback?: (error: unknown, success: boolean) => void) => void;
        };
        isVersionAtLeast: (version: string) => boolean;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          query_id?: string;
        };
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function isTelegramWebApp(): boolean {
  const webApp = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  if (!webApp?.CloudStorage) return false;
  return typeof webApp.isVersionAtLeast === "function" && webApp.isVersionAtLeast("6.9");
}

export function getTelegramUser(): TelegramUser | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

export function readyTelegramWebApp(): void {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;
  webApp.ready();
  try {
    webApp.expand();
  } catch {}
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function getStorage(): StorageAdapter {
  if (isTelegramWebApp()) {
    const tg = window.Telegram!.WebApp!;
    return {
      getItem: (key) =>
        new Promise((resolve) => {
          tg.CloudStorage.getItem(key, (err, value) => {
            if (err || value === null || value === undefined || value === "") {
              resolve(null);
            } else {
              resolve(value);
            }
          });
        }),
      setItem: (key, value) =>
        new Promise((resolve) => {
          tg.CloudStorage.setItem(key, value, () => resolve());
        }),
      removeItem: (key) =>
        new Promise((resolve) => {
          tg.CloudStorage.removeItem(key, () => resolve());
        }),
    };
  }

  return {
    getItem: async (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
    removeItem: async (key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };
}
