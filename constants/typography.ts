import { TextStyle } from 'react-native';

/**
 * Type system — "hierro y tiza".
 *
 * Two cuts of one superfamily, each with a job:
 *
 * - **Barlow Condensed** carries every number the app exists to show. It comes
 *   from Californian public signage, so it reads as stamped metal rather than
 *   as a UI font, and the narrow figures let a four-digit volume sit in a stat
 *   tile without shrinking.
 * - **Barlow** handles labels, buttons and prose — same skeleton, normal width,
 *   so the two never look like two different apps.
 *
 * Custom families do not combine with `fontWeight` in React Native: each weight
 * is its own family name. `FONTS` is the single place that mapping lives.
 */
export const FONTS = {
    /** Body / UI. */
    regular: 'Barlow_400Regular',
    medium: 'Barlow_500Medium',
    semibold: 'Barlow_600SemiBold',
    bold: 'Barlow_700Bold',

    /** Display: numbers, screen titles, anything that should read as signage. */
    display: 'BarlowCondensed_700Bold',
    displayMedium: 'BarlowCondensed_600SemiBold',
} as const;

/** Font asset map for `useFonts`, kept next to the names it defines. */
export { FONTS as FONT_FAMILIES };

export const FONT_SIZES = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
} as const;

/**
 * Ready-made text styles. Numbers use `tabular-nums` so a column of weights
 * stays in a straight line as the digits change between sets.
 */
export const TYPE = {
    /** Screen titles. */
    display: {
        fontFamily: FONTS.display,
        fontSize: 34,
        letterSpacing: 0.2,
    } satisfies TextStyle,

    /** Hero numbers: stat tiles, the rest countdown, records. */
    number: {
        fontFamily: FONTS.display,
        fontVariant: ['tabular-nums'],
    } satisfies TextStyle,

    /**
     * The tracked-out uppercase label above a value or section.
     * Reserved for units and categories — never for prose.
     */
    label: {
        fontFamily: FONTS.semibold,
        fontSize: 10,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
    } satisfies TextStyle,

    title: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.md,
        letterSpacing: -0.1,
    } satisfies TextStyle,

    body: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
    } satisfies TextStyle,

    bodyStrong: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.sm,
    } satisfies TextStyle,

    caption: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.xs,
    } satisfies TextStyle,
} as const;
