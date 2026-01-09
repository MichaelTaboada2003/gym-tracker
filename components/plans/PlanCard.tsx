import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { Plan } from '../../lib/database.types';

interface PlanCardProps {
    plan: Plan;
    onPress: () => void;
}

export function PlanCard({ plan, onPress }: PlanCardProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name}>{plan.name}</Text>
                    {plan.description && (
                        <Text style={styles.description} numberOfLines={2}>
                            {plan.description}
                        </Text>
                    )}
                </View>

                <View style={styles.footer}>
                    <View style={styles.badge}>
                        <Ionicons name="calendar-outline" size={12} color={COLORS.primary} />
                        <Text style={styles.badgeText}>{plan.duration_days || 7} Días</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        overflow: 'hidden',
    },
    content: {
        padding: SPACING.md,
    },
    header: {
        marginBottom: SPACING.md,
    },
    name: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    description: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
        gap: 4,
    },
    badgeText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.primary,
        fontWeight: '600',
    },
});
