import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, HIT_SIZE } from '../../constants/colors';

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
        <LinearGradient
            colors={[COLORS.primary + '15', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + SPACING.md }, style]}
        >
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
                                {action.variant === 'plain' || !action.variant ? (
                                    <View style={styles.actionPlain}>
                                        <Ionicons name={action.icon} size={20} color={COLORS.textPrimary} />
                                    </View>
                                ) : (
                                    <LinearGradient
                                        colors={
                                            action.variant === 'secondary'
                                                ? COLORS.gradients.secondary
                                                : COLORS.gradients.primary
                                        }
                                        style={styles.actionGradient}
                                    >
                                        <Ionicons name={action.icon} size={20} color="#FFF" />
                                    </LinearGradient>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
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
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 2.5,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    actionButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    actionGradient: {
        width: HIT_SIZE,
        height: HIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionPlain: {
        width: HIT_SIZE,
        height: HIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.overlay.medium,
        borderWidth: 1,
        borderColor: COLORS.overlay.light,
    },
});
