import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { SetMarks } from '../../components/ui/SetMarks';
import { BodyWeightWidget } from '../../components/home/BodyWeightWidget';
import { useHomeStats } from '../../hooks/useHomeStats';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useWorkoutStore } from '../../store/workoutStore';
import { formatMinutes, formatRelativeDate, formatVolume, formatVolumeShort } from '../../lib/utils';

/** Sessions per week the weekly ring fills up to. */
const WEEKLY_GOAL = 4;

export default function HomeScreen() {
    const router = useRouter();
    const { stats, recentWorkouts, loading, fetchHomeData } = useHomeStats();
    const isWorkoutActive = useWorkoutStore((state) => state.isActive);
    const activeRoutineName = useWorkoutStore((state) => state.routineName);

    // Finishing a workout on another tab has to be reflected here immediately.
    useRefreshOnFocus(fetchHomeData);

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
                                <Ionicons name="barbell" size={22} color={COLORS.onChalk} />
                            </View>
                            <View style={styles.resumeBody}>
                                <Text style={styles.resumeTitle}>Entrenamiento en curso</Text>
                                <Text style={styles.resumeSubtitle} numberOfLines={1}>
                                    {activeRoutineName || 'Entrenamiento libre'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.onChalk} />
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
                        <SetMarks
                            total={Math.max(WEEKLY_GOAL, stats.thisWeekSessions)}
                            completed={stats.thisWeekSessions}
                            size="md"
                            accessibilityLabel={`${stats.thisWeekSessions} de ${WEEKLY_GOAL} sesiones esta semana`}
                        />
                        <Text style={styles.goalCaption}>
                            {stats.thisWeekSessions >= WEEKLY_GOAL
                                ? '¡Objetivo semanal cumplido!'
                                : `Te faltan ${WEEKLY_GOAL - stats.thisWeekSessions} para tu objetivo`}
                        </Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <StatTile
                            icon="trending-up-outline"
                            color={COLORS.textSecondary}
                            value={formatVolumeShort(stats.thisWeekVolume)}
                            label="Volumen semanal"
                        />
                        <StatTile
                            icon="layers-outline"
                            color={COLORS.textSecondary}
                            value={String(stats.totalWorkouts)}
                            label="Sesiones totales"
                        />
                        <StatTile
                            icon="barbell-outline"
                            color={COLORS.textSecondary}
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
                                        <Ionicons name="barbell" size={17} color={COLORS.textSecondary} />
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
                                    <Text style={styles.recentVolume}>{formatVolume(workout.volume)}</Text>
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
            <Ionicons name={icon} size={16} color={color} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
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
        fontFamily: FONTS.display,
        fontSize: 20,
        letterSpacing: 0.3,
        color: COLORS.textPrimary,
    },
    linkText: {
        fontSize: FONT_SIZES.sm,
        fontFamily: FONTS.semibold,
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
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(12,13,15,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resumeBody: {
        flex: 1,
    },
    resumeTitle: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.md,
        color: COLORS.onChalk,
    },
    resumeSubtitle: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(12,13,15,0.7)',
        marginTop: 1,
    },
    startCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        marginBottom: SPACING.xl,
    },
    startIcon: {
        width: 42,
        height: 42,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 3,
    },
    startTitle: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.md,
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
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.warning + '18',
    },
    streakText: {
        fontFamily: FONTS.semibold,
        color: COLORS.warning,
        fontSize: 11,
    },
    goalCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        gap: SPACING.md,
    },
    goalHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: SPACING.xs,
    },
    goalValue: {
        fontFamily: FONTS.display,
        fontSize: 40,
        lineHeight: 42,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    goalTarget: {
        fontFamily: FONTS.display,
        fontSize: 22,
        color: COLORS.textMuted,
    },
    goalLabel: {
        fontFamily: FONTS.medium,
        fontSize: 10,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: COLORS.textSecondary,
    },
    goalCaption: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.textMuted,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    statItem: {
        flex: 1,
        gap: 5,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
    },
    statValue: {
        fontFamily: FONTS.display,
        fontSize: 24,
        lineHeight: 26,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontFamily: FONTS.medium,
        fontSize: 9,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.9,
    },
    recentList: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    recentItemLast: {
        borderBottomWidth: 0,
    },
    recentIcon: {
        width: 34,
        height: 34,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentInfo: {
        flex: 1,
    },
    recentName: {
        fontSize: FONT_SIZES.sm,
        fontFamily: FONTS.semibold,
        color: COLORS.textPrimary,
    },
    recentMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    recentVolume: {
        fontFamily: FONTS.display,
        fontSize: 15,
        color: COLORS.textSecondary,
        fontVariant: ['tabular-nums'],
    },
});
