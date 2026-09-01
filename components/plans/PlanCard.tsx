import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Plan } from '../../lib/database.types';

interface PlanCardProps {
    plan: Plan & {
        items?: Array<{
            routine?: {
                name: string;
                estimated_duration: number;
            };
        }>;
    };
    onPress: () => void;
    /** Long-press opens the plan's action menu (edit / delete). */
    onLongPress?: () => void;
}

export function PlanCard({ plan, onPress, onLongPress }: PlanCardProps) {
    // Calculate stats
    const totalRoutines = plan.items?.length || 0;
    const totalMinutes = plan.items?.reduce((sum, item) =>
        sum + (item.routine?.estimated_duration || 0), 0) || 0;

    // Get routine names for preview
    const routineNames = plan.items?.slice(0, 2).map(item => item.routine?.name).filter(Boolean) || [];

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.8}
        >
            <View style={styles.gradientBg}>
                <View style={styles.accentBar} />

                <View style={styles.content}>
                    {/* Header Row */}
                    <View style={styles.headerRow}>
                        {/* Icon */}
                        <View style={styles.iconContainer}>
                            <Ionicons name="calendar" size={17} color={COLORS.textSecondary} />
                        </View>

                        {/* Title and Description */}
                        <View style={styles.titleContainer}>
                            <Text style={styles.name}>{plan.name}</Text>
                            {plan.description && (
                                <Text style={styles.description} numberOfLines={1}>
                                    {plan.description}
                                </Text>
                            )}
                        </View>

                        {/* Chevron */}
                        <View style={styles.chevronContainer}>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="barbell" size={13} color={COLORS.textSecondary} />
                            <Text style={styles.statText}>
                                {plan.duration_days || 7} Días
                            </Text>
                        </View>

                        {totalRoutines > 0 && (
                            <View style={styles.statItem}>
                                <Ionicons name="barbell-outline" size={14} color={COLORS.textMuted} />
                                <Text style={styles.statText}>
                                    {totalRoutines} rutinas
                                </Text>
                            </View>
                        )}

                        {totalMinutes > 0 && (
                            <View style={styles.statItem}>
                                <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                                <Text style={styles.statText}>
                                    {totalMinutes} min/semana
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Routine Preview */}
                    {routineNames.length > 0 && (
                        <View style={styles.routinePreview}>
                            <Text style={styles.routinePreviewText}>
                                {routineNames.join(' • ')}
                                {(plan.items?.length || 0) > 2 && ` (+${(plan.items?.length || 0) - 2} más)`}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
    },
    gradientBg: {
        flexDirection: 'row',
    },
    accentBar: {
        width: 3,
        backgroundColor: COLORS.surfaceHighlight,
    },
    content: {
        flex: 1,
        padding: SPACING.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    iconContainer: {
        width: 34,
        height: 34,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
    },
    name: {
        fontFamily: FONTS.display,
        fontSize: 19,
        lineHeight: 21,
        color: COLORS.textPrimary,
    },
    description: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    chevronContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
        marginBottom: SPACING.xs,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontFamily: FONTS.medium,
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    routinePreview: {
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
        marginTop: SPACING.xs,
    },
    routinePreviewText: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
    },
});
