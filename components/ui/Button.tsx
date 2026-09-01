import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, View } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, HIT_SIZE } from '../../constants/colors';
import { FONTS } from '../../constants/typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    fullWidth?: boolean;
}

const HEIGHTS: Record<Size, number> = { sm: 36, md: HIT_SIZE, lg: 54 };
const LABEL_SIZES: Record<Size, number> = { sm: FONT_SIZES.xs, md: FONT_SIZES.sm, lg: FONT_SIZES.md };

/**
 * The primary action is a solid chalk block on iron.
 *
 * It is the loudest thing on any screen precisely because it is the only white
 * mass — no gradient needed, and it leaves colour free to mean muscle group.
 * `gradient` is kept as an alias of `primary` so older call sites still read as
 * "the main action".
 */
export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    style,
    fullWidth = false,
}: ButtonProps) {
    const isPrimary = variant === 'primary' || variant === 'gradient';
    const isBlocked = disabled || loading;

    const surface =
        isPrimary ? styles.surfacePrimary
        : variant === 'danger' ? styles.surfaceDanger
        : variant === 'secondary' ? styles.surfaceSecondary
        : styles.surfaceGhost;

    const labelColor =
        isPrimary ? COLORS.onChalk
        : variant === 'danger' ? COLORS.error
        : COLORS.textPrimary;

    return (
        <Pressable
            onPress={onPress}
            disabled={isBlocked}
            accessibilityRole="button"
            accessibilityState={{ disabled: isBlocked, busy: loading }}
            style={({ pressed }) => [
                styles.base,
                surface,
                {
                    height: HEIGHTS[size],
                    paddingHorizontal: size === 'sm' ? SPACING.md : SPACING.lg,
                    alignSelf: fullWidth ? 'stretch' : 'flex-start',
                },
                // A press dims the block rather than shrinking it — a 54pt bar
                // scaling under the thumb reads as a glitch on a phone.
                pressed && styles.pressed,
                isBlocked && styles.blocked,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={labelColor} size="small" />
            ) : (
                <View style={styles.content}>
                    {icon}
                    <Text style={[styles.label, { color: labelColor, fontSize: LABEL_SIZES[size] }]}>
                        {title}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    surfacePrimary: {
        backgroundColor: COLORS.primary,
    },
    surfaceSecondary: {
        backgroundColor: COLORS.surfaceLight,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.surfaceHighlight,
    },
    surfaceGhost: {
        backgroundColor: 'transparent',
    },
    surfaceDanger: {
        backgroundColor: COLORS.error + '1A',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.error + '55',
    },
    pressed: {
        opacity: 0.72,
    },
    blocked: {
        opacity: 0.4,
    },
    label: {
        fontFamily: FONTS.semibold,
        letterSpacing: 0.2,
        textAlign: 'center',
    },
});
