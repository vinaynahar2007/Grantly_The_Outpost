const STORAGE_PREFIX = "grantly_v1_";

export const storageService = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${key}`,
        JSON.stringify(value),
      );
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch {
      // Fail gracefully
    }
  },
};
