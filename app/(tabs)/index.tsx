import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { BodyWeightWidget } from '../../components/home/BodyWeightWidget';
import { useHomeStats } from '../../hooks/useHomeStats';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useWorkoutStore } from '../../store/workoutStore';
import { formatMinutes, formatRelativeDate, formatVolumeShort } from '../../lib/utils';

/** Sessions per week the weekly ring fills up to. */
const WEEKLY_GOAL = 4;

export default function HomeScreen() {
    const router = useRouter();
    const { stats, recentWorkouts, loading, fetchHomeData } = useHomeStats();
    const isWorkoutActive = useWorkoutStore((state) => state.isActive);
    const activeRoutineName = useWorkoutStore((state) => state.routineName);

    // Finishing a workout on another tab has to be reflected here immediately.
    useRefreshOnFocus(fetchHomeData);

    const goalProgress = Math.min(1, stats.thisWeekSessions / WEEKLY_GOAL);

    return (
        <View style={styles.container}>
            <ScreenHeader
                eyebrow="Hola de nuevo"
                title="Resumen"
                actions={[
                    {
                        icon: 'settings-outline',
                        accessibilityLabel: 'Ajustes',
                        onPress: () => router.push('/settings'),
                    },
                ]}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchHomeData} tintColor={COLORS.primary} />
                }
            >
                {/* Leaving a session running in the background used to be invisible. */}
                {isWorkoutActive ? (
                    <TouchableOpacity
                        style={styles.resumeCard}
                        onPress={() => router.navigate('/workout')}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={COLORS.gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.resumeGradient}
                        >
                            <View style={styles.resumeIcon}>
                                <Ionicons name="barbell" size={22} color="#FFF" />
                            </View>
                            <View style={styles.resumeBody}>
                                <Text style={styles.resumeTitle}>Entrenamiento en curso</Text>
                                <Text style={styles.resumeSubtitle} numberOfLines={1}>
                                    {activeRoutineName || 'Entrenamiento libre'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.startCard}
                        onPress={() => router.navigate('/workout')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.startIcon}>
                            <Ionicons name="play" size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.resumeBody}>
                            <Text style={styles.startTitle}>Empezar a entrenar</Text>
                            <Text style={styles.startSubtitle}>
                                {stats.daysSinceLastWorkout === null
                                    ? 'Registra tu primera sesión'
                                    : stats.daysSinceLastWorkout === 0
                                      ? 'Ya entrenaste hoy · suma otra sesión'
                                      : `Hace ${stats.daysSinceLastWorkout} ${stats.daysSinceLastWorkout === 1 ? 'día' : 'días'} del último entreno`}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}

                {/* Weekly goal */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>Esta semana</Text>
                        <View style={styles.streakBadge}>
                            <Ionicons name="flame" size={14} color={COLORS.warning} />
                            <Text style={styles.streakText}>
                                {stats.weekStreak} {stats.weekStreak === 1 ? 'semana' : 'semanas'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.goalCard}>
                        <View style={styles.goalHeader}>
                            <Text style={styles.goalValue}>
                                {stats.thisWeekSessions}
                                <Text style={styles.goalTarget}> / {WEEKLY_GOAL}</Text>
                            </Text>
                            <Text style={styles.goalLabel}>sesiones</Text>
                        </View>
                        <View style={styles.goalTrack}>
                            <LinearGradient
                                colors={COLORS.gradients.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.goalFill, { width: `${goalProgress * 100}%` }]}
                            />
                        </View>
                        <Text style={styles.goalCaption}>
                            {stats.thisWeekSessions >= WEEKLY_GOAL
                                ? '¡Objetivo semanal cumplido!'
                                : `Te faltan ${WEEKLY_GOAL - stats.thisWeekSessions} para tu objetivo`}
                        </Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <StatTile
                            icon="trending-up-outline"
                            color={COLORS.success}
                            value={formatVolumeShort(stats.thisWeekVolume)}
                            label="Volumen semanal"
                        />
                        <StatTile
                            icon="layers-outline"
                            color={COLORS.secondaryLight}
                            value={String(stats.totalWorkouts)}
                            label="Sesiones totales"
                        />
                        <StatTile
                            icon="barbell-outline"
                            color={COLORS.primaryLight}
                            value={formatVolumeShort(stats.totalVolume)}
                            label="Volumen total"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <BodyWeightWidget />
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>Actividad reciente</Text>
                        {recentWorkouts.length > 0 && (
                            <TouchableOpacity onPress={() => router.navigate('/calendar')}>
                                <Text style={styles.linkText}>Ver historial</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {recentWorkouts.length === 0 ? (
                        <EmptyState
                            icon="analytics-outline"
                            title="Sin entrenamientos todavía"
                            message="Cuando completes tu primera sesión aparecerá aquí junto a tu progreso."
                            actionLabel="Empezar ahora"
                            onAction={() => router.navigate('/workout')}
                        />
                    ) : (
                        <View style={styles.recentList}>
                            {recentWorkouts.map((workout, index) => (
                                <View
                                    key={workout.id}
                                    style={[
                                        styles.recentItem,
                                        index === recentWorkouts.length - 1 && styles.recentItemLast,
                                    ]}
                                >
                                    <View style={styles.recentIcon}>
                                        <Ionicons name="fitness" size={18} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.recentInfo}>
                                        <Text style={styles.recentName} numberOfLines={1}>
                                            {workout.routineName || 'Entrenamiento libre'}
                                        </Text>
                                        <Text style={styles.recentMeta}>
                                            {formatRelativeDate(workout.date)} · {workout.sets} series ·{' '}
                                            {formatMinutes(workout.durationMinutes)}
                                        </Text>
                                    </View>
                                    <Text style={styles.recentVolume}>{formatVolumeShort(workout.volume)} kg</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

function StatTile({
    icon,
    color,
    value,
    label,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    value: string;
    label: string;
}) {
    return (
        <View style={styles.statItem}>
            <LinearGradient colors={COLORS.gradients.glass} style={styles.statGradient}>
                <Ionicons name={icon} size={20} color={color} />
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xxl,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    linkText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.primaryLight,
    },
    resumeCard: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.xl,
    },
    resumeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.md,
    },
    resumeIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resumeBody: {
        flex: 1,
    },
    resumeTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: '#FFF',
    },
    resumeSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    startCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        marginBottom: SPACING.xl,
    },
    startIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 3,
    },
    startTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    startSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.warning + '18',
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
    },
    streakText: {
        color: COLORS.warning,
        fontWeight: '700',
        fontSize: FONT_SIZES.xs,
    },
    goalCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    goalHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: SPACING.xs,
    },
    goalValue: {
        fontSize: 30,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: -1,
    },
    goalTarget: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    goalLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    goalTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.surfaceLight,
        overflow: 'hidden',
    },
    goalFill: {
        height: '100%',
        borderRadius: 4,
    },
    goalCaption: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    statItem: {
        flex: 1,
    },
    statGradient: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xs,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.overlay.light,
        minHeight: 96,
        justifyContent: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: 9,
        color: COLORS.textSecondary,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontWeight: '700',
    },
    recentList: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        paddingHorizontal: SPACING.md,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    recentItemLast: {
        borderBottomWidth: 0,
    },
    recentIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentInfo: {
        flex: 1,
    },
    recentName: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    recentMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    recentVolume: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
});
