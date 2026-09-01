/**
 * Colour system — "hierro y tiza" (iron and chalk).
 *
 * The rule the whole app follows: **the interface is monochrome; colour only
 * ever means data.** Chrome, surfaces, buttons and icons are graphite and chalk.
 * The one place hue appears is the muscle-group palette below, so a glance at a
 * screen tells you what you trained, not where the designer put an accent.
 *
 * The muscle palette is borrowed from calibrated Olympic plates, and its
 * structure carries information: push muscles are the red family, pull muscles
 * the blue family, legs the green family.
 */

const IRON = {
    /** Page background. Cool graphite, deliberately not a blue-cast slate. */
    base: '#0C0D0F',
    /** Cards and sheets. */
    surface: '#141619',
    /** Inputs, chips, pressed states. */
    raised: '#1D2024',
    /** Hairlines and dividers. */
    rule: '#2A2E34',
} as const;

const CHALK = {
    /** Primary text, and the fill of the primary button. */
    full: '#F4F2ED',
    /** Secondary text. */
    smoke: '#8B9096',
    /** Muted text, disabled chrome. */
    ash: '#5A6068',
} as const;

/** Calibrated plate colours, brightened enough to stay legible on iron. */
const PLATE = {
    red: '#F0544C',
    redLight: '#F79A8E',
    blue: '#5B93E8',
    blueLight: '#9CC2F5',
    green: '#3FC46A',
    greenLight: '#86E0A0',
    yellow: '#F5CB55',
    chrome: '#B5BDC5',
    white: '#EDEAE4',
} as const;

export const COLORS = {
    // Interface — monochrome by design. `primary` is chalk: the app has no
    // brand hue of its own competing with the data.
    primary: CHALK.full,
    primaryLight: CHALK.full,
    primaryDark: '#D8D5CE',

    secondary: PLATE.chrome,
    secondaryLight: '#CDD3D9',
    secondaryDark: '#8C949B',

    // Status — drawn from the plate palette so warnings and records still read
    // as part of the same world.
    success: PLATE.green,
    warning: PLATE.yellow,
    error: PLATE.red,
    info: PLATE.blue,

    background: IRON.base,
    surface: IRON.surface,
    surfaceLight: IRON.raised,
    surfaceHighlight: IRON.rule,
    border: IRON.rule,

    textPrimary: CHALK.full,
    textHighlight: CHALK.full,
    textSecondary: CHALK.smoke,
    textMuted: CHALK.ash,

    /** Text/icon colour to place on top of a chalk fill. */
    onChalk: IRON.base,

    // Legacy single-muscle keys, kept pointing at the shared palette.
    chest: PLATE.red,
    back: PLATE.blue,
    shoulders: PLATE.yellow,
    arms: PLATE.redLight,
    legs: PLATE.green,
    core: PLATE.chrome,
    cardio: PLATE.white,

    /**
     * Gradients are near-invisible on purpose: they add depth to a surface,
     * never colour. The old vivid indigo/teal washes were doing the job that
     * the muscle palette does now.
     */
    gradients: {
        primary: ['#FFFFFF', '#D8D5CE'] as const,
        secondary: [IRON.raised, IRON.surface] as const,
        dark: [IRON.surface, IRON.base] as const,
        glass: ['rgba(255,255,255,0.045)', 'rgba(255,255,255,0.015)'] as const,
        success: [PLATE.green, PLATE.greenLight] as const,
        fire: [PLATE.yellow, PLATE.red] as const,
    },

    overlay: {
        light: 'rgba(244,242,237,0.06)',
        medium: 'rgba(244,242,237,0.10)',
        dark: 'rgba(0,0,0,0.55)',
    },
} as const;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export { FONT_SIZES } from './typography';

/**
 * Corners are machined, not soft. Tightening the scale is what stops a screen
 * full of cards from reading as a generic app shell.
 */
export const BORDER_RADIUS = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
} as const;

/**
 * One colour per muscle group.
 *
 * Grouped by movement pattern rather than picked at random: push is red, pull
 * is blue, legs are green. Two exercises that train the same pattern look
 * related on a routine card before you have read a single word.
 */
export const MUSCLE_COLORS: Record<string, string> = {
    Pecho: PLATE.red,
    Tríceps: PLATE.redLight,
    Espalda: PLATE.blue,
    Bíceps: PLATE.blueLight,
    Piernas: PLATE.green,
    Glúteos: PLATE.greenLight,
    Hombros: PLATE.yellow,
    Core: PLATE.chrome,
    Cardio: PLATE.white,
    Otros: CHALK.ash,
};

/** Colour for a muscle group label, falling back to the neutral "Otros" tone. */
export function getMuscleColor(muscleGroup?: string | null): string {
    if (!muscleGroup) return MUSCLE_COLORS.Otros;
    return MUSCLE_COLORS[muscleGroup] ?? MUSCLE_COLORS.Otros;
}

/** Minimum tappable size (iOS HIG / Material both land at ~44dp). */
export const HIT_SIZE = 44;
