let cachedDraftStorage;

const resolveStorage = () => {
  if (typeof window === "undefined") return null;

  const getSafeStorage = (type) => {
    try {
      const storage = window[type];
      if (!storage) return null;
      const testKey = "__komuness_draft_test__";
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return storage;
    } catch {
      return null;
    }
  };

  return getSafeStorage("localStorage") || getSafeStorage("sessionStorage");
};

const getDraftStorage = () => {
  if (cachedDraftStorage !== undefined) return cachedDraftStorage;
  cachedDraftStorage = resolveStorage();
  return cachedDraftStorage;
};

export const readSessionDraft = (key, fallbackValue = null) => {
  const storage = getDraftStorage();
  if (!storage || !key) return fallbackValue;

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return fallbackValue;
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

export const writeSessionDraft = (key, value) => {
  const storage = getDraftStorage();
  if (!storage || !key) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignorar errores de storage (modo privado/cuota excedida)
  }
};

export const removeSessionDraft = (key) => {
  const storage = getDraftStorage();
  if (!storage || !key) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignorar errores de storage
  }
};
