export const THEME_CONFIG_KEY = 'tematica_sitio';
export const THEME_TIMEZONE = 'America/Costa_Rica';
const COLOR_HEX_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type ThemePalette = {
    siteBackgroundColorEnabled: boolean;
    siteBackgroundColor: string;
    siteBackgroundImageUrl: string;
    navbarBackgroundColor: string;
    navbarTextColor: string;
    navbarActiveBackgroundColor: string;
    navbarActiveTextColor: string;
    cardBackgroundColor: string;
    cardTextColor: string;
    cardSecondaryTextColor: string;
    cardBorderColor: string;
};

export type PartialThemePalette = Partial<ThemePalette>;

export type ScheduledTheme = {
    id: string;
    nombre: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin: string;
    activo: boolean;
    prioridad: number;
    tema: PartialThemePalette;
};

export type ThemeConfigurationValue = {
    base: PartialThemePalette;
    programadas: ScheduledTheme[];
    timezone?: string;
};

export const DEFAULT_THEME_PALETTE: ThemePalette = {
    siteBackgroundColorEnabled: true,
    siteBackgroundColor: '#5445ff',
    siteBackgroundImageUrl: '/background.png',
    navbarBackgroundColor: '#ffbf30',
    navbarTextColor: '#000000',
    navbarActiveBackgroundColor: '#e5a800',
    navbarActiveTextColor: '#ffffff',
    cardBackgroundColor: '#5445ff',
    cardTextColor: '#f0f2f7',
    cardSecondaryTextColor: '#b4cff8',
    cardBorderColor: '#4c3df0'
};

type AnyObject = Record<string, unknown>;

const safeObject = (value: unknown): AnyObject =>
    typeof value === 'object' && value !== null ? (value as AnyObject) : {};

const normalizeColor = (value: unknown, fallback: string): string =>
    typeof value === 'string' && COLOR_HEX_REGEX.test(value.trim())
        ? value.trim()
        : fallback;

const normalizeBoolean = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;

const getValidColor = (value: unknown): string | undefined =>
    typeof value === 'string' && COLOR_HEX_REGEX.test(value.trim())
        ? value.trim()
        : undefined;

const getValidBoolean = (value: unknown): boolean | undefined =>
    typeof value === 'boolean' ? value : undefined;

const normalizeImageUrl = (value: unknown, fallback: string): string => {
    if (typeof value !== 'string') return fallback;
    const candidate = value.trim();
    if (!candidate) return '';

    const isSafeAbsolute = /^https?:\/\/[^\s]+$/i.test(candidate);
    const isSafeRelative = candidate.startsWith('/');
    const isDataImage = /^data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+$/.test(candidate);

    if (isSafeAbsolute || isSafeRelative || isDataImage) {
        return candidate;
    }

    return fallback;
};

const getValidImageUrl = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const candidate = value.trim();
    if (!candidate) return '';

    const isSafeAbsolute = /^https?:\/\/[^\s]+$/i.test(candidate);
    const isSafeRelative = candidate.startsWith('/');
    const isDataImage = /^data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+$/.test(candidate);

    if (isSafeAbsolute || isSafeRelative || isDataImage) {
        return candidate;
    }

    return undefined;
};

const normalizeDateOnly = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const date = value.trim();
    if (!DATE_ONLY_REGEX.test(date)) return null;

    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return null;

    return date;
};

const normalizePriority = (value: unknown): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(-9999, Math.min(9999, Math.round(parsed)));
};

const normalizeName = (value: unknown, fallback = 'Tema programado'): string => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return trimmed.length > 80 ? trimmed.slice(0, 80) : trimmed;
};

const normalizeDescription = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.length > 240 ? trimmed.slice(0, 240) : trimmed;
};

export const normalizeThemePalette = (
    raw: unknown,
    fallback: ThemePalette = DEFAULT_THEME_PALETTE
): ThemePalette => {
    const input = safeObject(raw);

    return {
        siteBackgroundColorEnabled: normalizeBoolean(input.siteBackgroundColorEnabled, fallback.siteBackgroundColorEnabled),
        siteBackgroundColor: normalizeColor(input.siteBackgroundColor, fallback.siteBackgroundColor),
        siteBackgroundImageUrl: normalizeImageUrl(input.siteBackgroundImageUrl, fallback.siteBackgroundImageUrl),
        navbarBackgroundColor: normalizeColor(input.navbarBackgroundColor, fallback.navbarBackgroundColor),
        navbarTextColor: normalizeColor(input.navbarTextColor, fallback.navbarTextColor),
        navbarActiveBackgroundColor: normalizeColor(input.navbarActiveBackgroundColor, fallback.navbarActiveBackgroundColor),
        navbarActiveTextColor: normalizeColor(input.navbarActiveTextColor, fallback.navbarActiveTextColor),
        cardBackgroundColor: normalizeColor(input.cardBackgroundColor, fallback.cardBackgroundColor),
        cardTextColor: normalizeColor(input.cardTextColor, fallback.cardTextColor),
        cardSecondaryTextColor: normalizeColor(input.cardSecondaryTextColor, fallback.cardSecondaryTextColor),
        cardBorderColor: normalizeColor(input.cardBorderColor, fallback.cardBorderColor)
    };
};

const normalizePartialThemePalette = (raw: unknown): PartialThemePalette => {
    const input = safeObject(raw);
    const partial: PartialThemePalette = {};

    const siteBackgroundColorEnabled = getValidBoolean(input.siteBackgroundColorEnabled);
    if (siteBackgroundColorEnabled !== undefined) {
        partial.siteBackgroundColorEnabled = siteBackgroundColorEnabled;
    }

    const siteBackgroundColor = getValidColor(input.siteBackgroundColor);
    if (siteBackgroundColor !== undefined) partial.siteBackgroundColor = siteBackgroundColor;

    const siteBackgroundImageUrl = getValidImageUrl(input.siteBackgroundImageUrl);
    if (siteBackgroundImageUrl !== undefined) partial.siteBackgroundImageUrl = siteBackgroundImageUrl;

    const navbarBackgroundColor = getValidColor(input.navbarBackgroundColor);
    if (navbarBackgroundColor !== undefined) partial.navbarBackgroundColor = navbarBackgroundColor;

    const navbarTextColor = getValidColor(input.navbarTextColor);
    if (navbarTextColor !== undefined) partial.navbarTextColor = navbarTextColor;

    const navbarActiveBackgroundColor = getValidColor(input.navbarActiveBackgroundColor);
    if (navbarActiveBackgroundColor !== undefined) {
        partial.navbarActiveBackgroundColor = navbarActiveBackgroundColor;
    }

    const navbarActiveTextColor = getValidColor(input.navbarActiveTextColor);
    if (navbarActiveTextColor !== undefined) partial.navbarActiveTextColor = navbarActiveTextColor;

    const cardBackgroundColor = getValidColor(input.cardBackgroundColor);
    if (cardBackgroundColor !== undefined) partial.cardBackgroundColor = cardBackgroundColor;

    const cardTextColor = getValidColor(input.cardTextColor);
    if (cardTextColor !== undefined) partial.cardTextColor = cardTextColor;

    const cardSecondaryTextColor = getValidColor(input.cardSecondaryTextColor);
    if (cardSecondaryTextColor !== undefined) partial.cardSecondaryTextColor = cardSecondaryTextColor;

    const cardBorderColor = getValidColor(input.cardBorderColor);
    if (cardBorderColor !== undefined) partial.cardBorderColor = cardBorderColor;

    return partial;
};

export const normalizeScheduledTheme = (raw: unknown, index = 0): ScheduledTheme | null => {
    const item = safeObject(raw);
    const fechaInicio = normalizeDateOnly(item.fechaInicio);
    const fechaFinCandidate = normalizeDateOnly(item.fechaFin);

    if (!fechaInicio) return null;

    const fechaFin = fechaFinCandidate ?? fechaInicio;
    if (fechaFin < fechaInicio) return null;

    const idRaw = typeof item.id === 'string' ? item.id.trim() : '';

    return {
        id: idRaw || `tema-programado-${index + 1}`,
        nombre: normalizeName(item.nombre),
        descripcion: normalizeDescription(item.descripcion),
        fechaInicio,
        fechaFin,
        activo: item.activo !== false,
        prioridad: normalizePriority(item.prioridad),
        tema: normalizePartialThemePalette(item.tema ?? {})
    };
};

export const normalizeThemeConfiguration = (raw: unknown): ThemeConfigurationValue => {
    const input = safeObject(raw);
    const base = normalizeThemePalette(input.base ?? {}, DEFAULT_THEME_PALETTE);

    const rawProgramadas = Array.isArray(input.programadas) ? input.programadas : [];
    const normalizedProgramadas = rawProgramadas
        .map((item, index) => normalizeScheduledTheme(item, index))
        .filter((item): item is ScheduledTheme => item !== null);

    return {
        base,
        programadas: normalizedProgramadas,
        timezone: THEME_TIMEZONE
    };
};

export const getDateKeyForTimezone = (date: Date, timeZone = THEME_TIMEZONE): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    return formatter.format(date);
};

export type ResolvedTheme = {
    theme: ThemePalette;
    activeSchedule: ScheduledTheme | null;
    dateKey: string;
    timezone: string;
};

export const resolveThemeForDate = (
    configuration: ThemeConfigurationValue,
    date = new Date()
): ResolvedTheme => {
    const timezone = configuration.timezone || THEME_TIMEZONE;
    const dateKey = getDateKeyForTimezone(date, timezone);

    const activeSchedules = configuration.programadas
        .filter((item) => item.activo && item.fechaInicio <= dateKey && item.fechaFin >= dateKey)
        .sort((a, b) => {
            if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
            return b.fechaInicio.localeCompare(a.fechaInicio);
        });

    const activeSchedule = activeSchedules[0] ?? null;
    const baseTheme = normalizeThemePalette(configuration.base, DEFAULT_THEME_PALETTE);
    const finalTheme = activeSchedule
        ? normalizeThemePalette({ ...baseTheme, ...activeSchedule.tema }, baseTheme)
        : baseTheme;

    return {
        theme: finalTheme,
        activeSchedule,
        dateKey,
        timezone
    };
};
