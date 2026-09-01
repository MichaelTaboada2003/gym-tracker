import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Button } from './Button';

interface EmptyStateProps {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    /** One line explaining what to do next — never just "sin datos". */
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

/** Consistent "nothing here yet" panel with a way forward. */
export function EmptyState({ icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.iconCircle}>
                <Ionicons name={icon} size={26} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
            {actionLabel && onAction && (
                <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    title: {
        fontFamily: FONTS.display,
        fontSize: 19,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    message: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.xs,
    },
});
