import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
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
                <Ionicons name={icon} size={32} color={COLORS.primary} />
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
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    title: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    message: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.xs,
    },
});
