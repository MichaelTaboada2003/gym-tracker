import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, HIT_SIZE } from '../../constants/colors';
import { FONTS } from '../../constants/typography';

export interface HeaderAction {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
    accessibilityLabel: string;
    /** Gradient pill instead of the default flat glass button. */
    variant?: 'plain' | 'primary' | 'secondary';
}

interface ScreenHeaderProps {
    /** Small tracked-out line above the title. */
    eyebrow?: string;
    title: string;
    onBack?: () => void;
    actions?: HeaderAction[];
    style?: ViewStyle;
}

/**
 * The gradient page header shared by every top-level screen.
 *
 * Each screen used to hand-roll this with a hard-coded `paddingTop`, which
 * collided with the notch on some devices and left a gap on others. The inset
 * comes from the safe area now.
 */
export function ScreenHeader({ eyebrow, title, onBack, actions = [], style }: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }, style]}>
            <View style={styles.row}>
                {onBack && (
                    <TouchableOpacity
                        onPress={onBack}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Volver"
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                )}

                <View style={styles.titleBlock}>
                    {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                {actions.length > 0 && (
                    <View style={styles.actions}>
                        {actions.map((action) => (
                            <TouchableOpacity
                                key={action.accessibilityLabel}
                                onPress={action.onPress}
                                style={styles.actionButton}
                                accessibilityRole="button"
                                accessibilityLabel={action.accessibilityLabel}
                            >
                                <View
                                    style={[
                                        styles.action,
                                        action.variant === 'primary' && styles.actionPrimary,
                                        action.variant === 'secondary' && styles.actionSecondary,
                                    ]}
                                >
                                    <Ionicons
                                        name={action.icon}
                                        size={20}
                                        color={
                                            action.variant === 'primary'
                                                ? COLORS.onChalk
                                                : COLORS.textPrimary
                                        }
                                    />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.background,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    backButton: {
        width: HIT_SIZE,
        height: HIT_SIZE,
        marginLeft: -SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleBlock: {
        flex: 1,
    },
    eyebrow: {
        fontFamily: FONTS.semibold,
        fontSize: 10,
        color: COLORS.textMuted,
        letterSpacing: 2,
        marginBottom: 1,
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: FONTS.display,
        fontSize: 34,
        lineHeight: 36,
        color: COLORS.textPrimary,
        letterSpacing: 0.2,
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    actionButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    action: {
        width: HIT_SIZE,
        height: HIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.surfaceHighlight,
    },
    actionPrimary: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    actionSecondary: {
        backgroundColor: COLORS.surfaceLight,
    },
});
