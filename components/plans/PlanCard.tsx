import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
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

// Color schemes for plans
const PLAN_GRADIENTS: [string, string][] = [
    ['#8B5CF6', '#6366F1'], // Purple
    ['#06B6D4', '#0891B2'], // Cyan
    ['#10B981', '#059669'], // Green
    ['#F59E0B', '#D97706'], // Amber
    ['#EC4899', '#DB2777'], // Pink
];

export function PlanCard({ plan, onPress, onLongPress }: PlanCardProps) {
    // Get gradient based on plan name hash for consistency
    const gradientIndex = plan.name.length % PLAN_GRADIENTS.length;
    const gradient = PLAN_GRADIENTS[gradientIndex];

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
            <LinearGradient
                colors={[gradient[0] + '15', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBg}
            >
                {/* Left accent */}
                <LinearGradient
                    colors={gradient}
                    style={styles.accentBar}
                />

                <View style={styles.content}>
                    {/* Header Row */}
                    <View style={styles.headerRow}>
                        {/* Icon */}
                        <LinearGradient
                            colors={gradient}
                            style={styles.iconContainer}
                        >
                            <Ionicons name="calendar" size={18} color="#FFF" />
                        </LinearGradient>

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
                            <Ionicons name="fitness" size={14} color={gradient[0]} />
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
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
    },
    gradientBg: {
        flexDirection: 'row',
    },
    accentBar: {
        width: 4,
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
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    titleContainer: {
        flex: 1,
    },
    name: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    description: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
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
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    routinePreview: {
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
        marginTop: SPACING.xs,
    },
    routinePreviewText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
});
