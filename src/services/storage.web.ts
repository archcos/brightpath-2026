// expo-secure-store has no web implementation. sessionStorage keeps the token out of
// long-lived storage and clears it when the tab closes. Access can throw in private modes.
export const storage = {
  get: async (key: string) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  },
  remove: async (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  },
};
