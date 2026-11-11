import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_URL } from "../../utils/api";

const THEME_REFRESH_MS = 5 * 60 * 1000;

export const DEFAULT_THEME = {
  siteBackgroundColorEnabled: true,
  siteBackgroundColor: "#5445ff",
  siteBackgroundImageUrl: "",
  navbarBackgroundColor: "#ffbf30",
  navbarTextColor: "#000000",
  navbarActiveBackgroundColor: "#e5a800",
  navbarActiveTextColor: "#ffffff",
  cardBackgroundColor: "#5445ff",
  cardTextColor: "#f0f2f7",
  cardSecondaryTextColor: "#b4cff8",
  cardBorderColor: "#4c3df0",
};

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  loading: true,
  activeSchedule: null,
  date: "",
  timezone: "America/Costa_Rica",
  reloadTheme: async () => {},
});

const COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const normalizeColor = (value, fallback) =>
  typeof value === "string" && COLOR_REGEX.test(value.trim())
    ? value.trim()
    : fallback;

const normalizeImageUrl = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed;
};

const normalizeBoolean = (value, fallback) =>
  typeof value === "boolean" ? value : fallback;

const normalizeTheme = (rawTheme) => ({
  siteBackgroundColorEnabled: normalizeBoolean(
    rawTheme?.siteBackgroundColorEnabled,
    DEFAULT_THEME.siteBackgroundColorEnabled,
  ),
  siteBackgroundColor: normalizeColor(
    rawTheme?.siteBackgroundColor,
    DEFAULT_THEME.siteBackgroundColor,
  ),
  siteBackgroundImageUrl: normalizeImageUrl(
    rawTheme?.siteBackgroundImageUrl,
    DEFAULT_THEME.siteBackgroundImageUrl,
  ),
  navbarBackgroundColor: normalizeColor(
    rawTheme?.navbarBackgroundColor,
    DEFAULT_THEME.navbarBackgroundColor,
  ),
  navbarTextColor: normalizeColor(
    rawTheme?.navbarTextColor,
    DEFAULT_THEME.navbarTextColor,
  ),
  navbarActiveBackgroundColor: normalizeColor(
    rawTheme?.navbarActiveBackgroundColor,
    DEFAULT_THEME.navbarActiveBackgroundColor,
  ),
  navbarActiveTextColor: normalizeColor(
    rawTheme?.navbarActiveTextColor,
    DEFAULT_THEME.navbarActiveTextColor,
  ),
  cardBackgroundColor: normalizeColor(
    rawTheme?.cardBackgroundColor,
    DEFAULT_THEME.cardBackgroundColor,
  ),
  cardTextColor: normalizeColor(rawTheme?.cardTextColor, DEFAULT_THEME.cardTextColor),
  cardSecondaryTextColor: normalizeColor(
    rawTheme?.cardSecondaryTextColor,
    DEFAULT_THEME.cardSecondaryTextColor,
  ),
  cardBorderColor: normalizeColor(
    rawTheme?.cardBorderColor,
    DEFAULT_THEME.cardBorderColor,
  ),
});

const applyThemeToRoot = (theme) => {
  const root = document.documentElement;
  const image = theme.siteBackgroundImageUrl?.trim();
  const imageCssValue = image ? `url("${image}")` : "none";
  const siteBackgroundColor = theme.siteBackgroundColorEnabled
    ? theme.siteBackgroundColor
    : "transparent";

  root.style.setProperty("--theme-site-background-color", siteBackgroundColor);
  root.style.setProperty("--theme-site-background-image", imageCssValue);
  root.style.setProperty("--theme-navbar-bg", theme.navbarBackgroundColor);
  root.style.setProperty("--theme-navbar-text", theme.navbarTextColor);
  root.style.setProperty(
    "--theme-navbar-active-bg",
    theme.navbarActiveBackgroundColor,
  );
  root.style.setProperty(
    "--theme-navbar-active-text",
    theme.navbarActiveTextColor,
  );
  root.style.setProperty("--theme-card-bg", theme.cardBackgroundColor);
  root.style.setProperty("--theme-card-text", theme.cardTextColor);
  root.style.setProperty(
    "--theme-card-secondary-text",
    theme.cardSecondaryTextColor,
  );
  root.style.setProperty("--theme-card-border", theme.cardBorderColor);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [date, setDate] = useState("");
  const [timezone, setTimezone] = useState("America/Costa_Rica");

  const reloadTheme = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/configuracion/tematica`);
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload?.success && payload?.data?.theme) {
        const normalizedTheme = normalizeTheme(payload.data.theme);
        setTheme(normalizedTheme);
        setActiveSchedule(payload.data.activeSchedule || null);
        setDate(payload.data.date || "");
        setTimezone(payload.data.timezone || "America/Costa_Rica");
        applyThemeToRoot(normalizedTheme);
        return;
      }
    } catch (_error) {
      // Silencioso: mantener fallback local
    }

    setTheme(DEFAULT_THEME);
    setActiveSchedule(null);
    setDate("");
    setTimezone("America/Costa_Rica");
    applyThemeToRoot(DEFAULT_THEME);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await reloadTheme();
      if (mounted) {
        setLoading(false);
      }
    };

    load();

    const interval = setInterval(() => {
      reloadTheme();
    }, THEME_REFRESH_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [reloadTheme]);

  const contextValue = useMemo(
    () => ({
      theme,
      loading,
      activeSchedule,
      date,
      timezone,
      reloadTheme,
    }),
    [theme, loading, activeSchedule, date, timezone, reloadTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
