import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl, TouchableOpacity } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Card } from '../../components/ui/Card';
import { storage } from '../../lib/localDatabase';
import { useAdvancedStats } from '../../hooks/useAdvancedStats';
import { ExerciseProgressWidget } from '../../components/stats/ExerciseHistoryWidget';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import {
    formatMinutes,
    formatVolume,
    formatWeight,
    parseISODate,
    startOfWeek,
    toISODate,
    weekdayIndex,
} from '../../lib/utils';

const { width } = Dimensions.get('window');

interface Stats {
    totalWorkouts: number;
    totalSets: number;
    totalVolume: number;
    totalMinutes: number;
}

interface WeeklyVolume {
    value: number;
    label: string;
    frontColor?: string;
}

export default function StatsScreen() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({
        totalWorkouts: 0,
        totalSets: 0,
        totalVolume: 0,
        totalMinutes: 0,
    });
    const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolume[]>([
        { value: 0, label: 'L' },
        { value: 0, label: 'M' },
        { value: 0, label: 'X' },
        { value: 0, label: 'J' },
        { value: 0, label: 'V' },
        { value: 0, label: 'S' },
        { value: 0, label: 'D' },
    ]);
    const [weeklySessions, setWeeklySessions] = useState<WeeklyVolume[]>([
        { value: 0, label: 'L' },
        { value: 0, label: 'M' },
        { value: 0, label: 'X' },
        { value: 0, label: 'J' },
        { value: 0, label: 'V' },
        { value: 0, label: 'S' },
        { value: 0, label: 'D' },
    ]);
    const [hasVolumeData, setHasVolumeData] = useState(false);
    const [hasSessionsThisWeek, setHasSessionsThisWeek] = useState(false);
    const [loading, setLoading] = useState(true);

    // Advanced stats hook
    const {
        muscleGroupStats,
        pieChartData,
        getTopRecords,
        loading: advancedLoading,
        refetch: refetchAdvanced
    } = useAdvancedStats();

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch from AsyncStorage
            const sessions = await storage.workoutSessions.getAll() as any[];
            const logs = await storage.workoutLogs.getAll() as any[];

            const totalWorkouts = sessions.length;
            const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

            const workLogs = logs.filter(l => l.is_warmup !== 1 && l.is_warmup !== true);
            const totalSets = workLogs.length;
            const totalVolume = workLogs.reduce((sum, l) => sum + (Number(l.weight_kg) * l.reps), 0);

            setStats({
                totalWorkouts,
                totalSets,
                totalVolume,
                totalMinutes,
            });

            // Week runs Monday→Sunday, compared on local calendar days.
            const today = new Date();
            const weekStart = toISODate(startOfWeek(today));

            const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
            const volumeByDay: number[] = [0, 0, 0, 0, 0, 0, 0];
            const sessionsByDay: number[] = [0, 0, 0, 0, 0, 0, 0];

            const weekSessions = sessions.filter(s => s.session_date >= weekStart);

            weekSessions.forEach(session => {
                const dayIndex = weekdayIndex(parseISODate(session.session_date));

                sessionsByDay[dayIndex] += 1;

                const sessionLogs = logs.filter(l => l.session_id === session.id && l.is_warmup !== 1 && l.is_warmup !== true);
                const sessionVolume = sessionLogs.reduce((sum, l) => sum + (Number(l.weight_kg) * l.reps), 0);
                volumeByDay[dayIndex] += sessionVolume;
            });

            const todayIndex = weekdayIndex(today);

            const totalWeekVolume = volumeByDay.reduce((sum, v) => sum + v, 0);
            setHasVolumeData(totalWeekVolume > 0);
            setHasSessionsThisWeek(weekSessions.length > 0);

            setWeeklyVolume(weekDays.map((label, i) => ({
                value: Math.round(volumeByDay[i]),
                label,
                frontColor: i === todayIndex ? COLORS.primary : COLORS.surfaceHighlight,
            })));

            setWeeklySessions(weekDays.map((label, i) => ({
                value: sessionsByDay[i],
                label,
                frontColor: i === todayIndex ? COLORS.primary : COLORS.surfaceHighlight,
            })));

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchStats();
    }, [fetchStats]);

    const handleRefresh = useCallback(async () => {
        await Promise.all([fetchStats(), refetchAdvanced()]);
    }, [fetchStats, refetchAdvanced]);

    // Numbers here go stale the moment a workout is saved on another tab.
    useRefreshOnFocus(handleRefresh);

    const maxVolume = Math.max(...weeklyVolume.map(v => v.value), 100);
    const topRecords = getTopRecords(5);

    return (
        <View style={styles.container}>
            <ScreenHeader
                eyebrow="Analiza tu"
                title="Progreso"
                actions={[
                    {
                        icon: 'calendar',
                        variant: 'secondary',
                        accessibilityLabel: 'Ver calendario',
                        onPress: () => router.push('/calendar'),
                    },
                ]}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={loading || advancedLoading} onRefresh={handleRefresh} tintColor={COLORS.primary} />
                }
            >

                {/* Weekly Activity Chart */}
                <Card title={hasVolumeData ? "Volumen de la semana" : "Sesiones de la semana"}>
                    <View style={styles.chartContainer}>
                        {hasVolumeData ? (
                            <BarChart
                                data={weeklyVolume}
                                width={width - SPACING.md * 4 - 60}
                                height={150}
                                barWidth={24}
                                barBorderRadius={4}
                                frontColor={COLORS.primary}
                                yAxisColor={'transparent'}
                                xAxisColor={COLORS.surfaceHighlight}
                                yAxisTextStyle={styles.axisText}
                                xAxisLabelTextStyle={styles.axisLabel}
                                noOfSections={4}
                                maxValue={maxVolume}
                                hideRules={true}
                                isAnimated={true}
                                spacing={16}
                            />
                        ) : hasSessionsThisWeek ? (
                            <BarChart
                                data={weeklySessions}
                                width={width - SPACING.md * 4 - 60}
                                height={150}
                                barWidth={24}
                                barBorderRadius={4}
                                frontColor={COLORS.primary}
                                yAxisColor={'transparent'}
                                xAxisColor={COLORS.surfaceHighlight}
                                yAxisTextStyle={styles.axisText}
                                xAxisLabelTextStyle={styles.axisLabel}
                                noOfSections={4}
                                maxValue={Math.max(...weeklySessions.map(v => v.value), 3)}
                                hideRules={true}
                                isAnimated={true}
                                spacing={16}
                            />
                        ) : (
                            <View style={styles.emptyChart}>
                                <Ionicons name="bar-chart-outline" size={48} color={COLORS.textMuted} />
                                <Text style={styles.emptyChartText}>Sin datos esta semana</Text>
                            </View>
                        )}
                    </View>
                </Card>

                {/* Muscle Group Distribution - Pie Chart */}
                <Card title="Distribución por músculo">
                    {muscleGroupStats.length > 0 ? (
                        <View style={styles.chartContainer}>
                            <View style={styles.pieContainer}>
                                <PieChart
                                    data={pieChartData}
                                    donut={true}
                                    showGradient={false}
                                    sectionAutoFocus={true}
                                    radius={110}
                                    innerRadius={75}
                                    innerCircleColor={COLORS.surface}
                                    centerLabelComponent={() => (
                                        <View style={styles.pieCenter}>
                                            <Text style={styles.pieCenterValue}>{stats.totalSets}</Text>
                                            <Text style={styles.pieCenterLabel}>Series</Text>
                                        </View>
                                    )}
                                />
                            </View>
                            <View style={styles.legendContainer}>
                                {muscleGroupStats.map((stat) => (
                                    <View key={stat.muscleGroup} style={styles.legendItemChip}>
                                        <View style={[styles.legendDot, { backgroundColor: stat.color }]} />
                                        <Text style={styles.legendText}>{stat.muscleGroup}</Text>
                                        <Text style={styles.legendValue}>{stat.sets}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>



                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                Completa entrenamientos para ver tu distribución
                            </Text>
                        </View>
                    )}
                </Card>

                {/* Personal Records - 1RM */}
                <Card title="Récords personales">
                    {topRecords.length > 0 ? (
                        <View style={styles.prList}>
                            {topRecords.map((record, index) => (
                                <View key={record.exerciseId} style={styles.prItem}>
                                    <View style={styles.prRank}>
                                        <Text style={styles.prRankText}>#{index + 1}</Text>
                                    </View>
                                    <View style={styles.prInfo}>
                                        <Text style={styles.prExercise}>{record.exerciseName}</Text>
                                        <Text style={styles.prDetails}>
                                            {formatWeight(record.weight)}kg × {record.reps} reps
                                        </Text>
                                    </View>
                                    <View style={styles.prValue}>
                                        <Text style={styles.pr1RM}>{Math.round(record.estimated1RM)}</Text>
                                        <Text style={styles.prUnit}>kg</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                Registra entrenamientos con peso para ver tus PRs
                            </Text>
                        </View>
                    )}
                </Card>

                {/* Overall Stats */}
                <Card title="Totales">
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Ionicons name="barbell" size={20} color={COLORS.textSecondary} style={styles.statIcon} />
                            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
                            <Text style={styles.statLabel}>Entrenamientos</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="layers" size={20} color={COLORS.textSecondary} style={styles.statIcon} />
                            <Text style={styles.statValue}>{stats.totalSets}</Text>
                            <Text style={styles.statLabel}>Series</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="barbell" size={20} color={COLORS.textSecondary} style={styles.statIcon} />
                            <Text style={styles.statValue}>{formatVolume(stats.totalVolume)}</Text>
                            <Text style={styles.statLabel}>Volumen</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="time" size={20} color={COLORS.textSecondary} style={styles.statIcon} />
                            <Text style={styles.statValue}>{formatMinutes(stats.totalMinutes)}</Text>
                            <Text style={styles.statLabel}>Tiempo</Text>
                        </View>
                    </View>
                </Card>

                {/* Exercise History Widget */}
                <Card>
                    <ExerciseProgressWidget />
                </Card>
            </ScrollView>
        </View >
    );
}

const styles = StyleSheet.create({
    axisText: {
        fontFamily: FONTS.display,
        color: COLORS.textMuted,
        fontSize: 11,
    },
    axisLabel: {
        fontFamily: FONTS.semibold,
        color: COLORS.textSecondary,
        fontSize: 11,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
        gap: SPACING.lg,
    },
    scrollView: {
        flex: 1,
    },
    chartContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    emptyChart: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    emptyChartText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },
    pieContainer: {
        alignItems: 'center',
        marginVertical: SPACING.md,
    },
    pieCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 150,
        height: 150,
    },
    pieCenterValue: {
        fontFamily: FONTS.display,
        fontSize: 34,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    pieCenterLabel: {
        fontFamily: FONTS.medium,
        fontSize: 9,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    legendItemChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontFamily: FONTS.medium,
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    legendValue: {
        fontFamily: FONTS.display,
        fontSize: 13,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    prList: {
        gap: SPACING.sm,
    },
    prItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    prRank: {
        width: 26,
        alignItems: 'center',
    },
    prRankText: {
        fontFamily: FONTS.display,
        fontSize: 15,
        color: COLORS.textMuted,
        fontVariant: ['tabular-nums'],
    },
    prInfo: {
        flex: 1,
    },
    prExercise: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    prDetails: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    prValue: {
        alignItems: 'flex-end',
    },
    pr1RM: {
        fontFamily: FONTS.display,
        fontSize: 24,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    prUnit: {
        fontFamily: FONTS.medium,
        fontSize: 10,
        color: COLORS.textMuted,
        marginLeft: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
    },
    emptyText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    statItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
    },
    statIcon: {
        marginBottom: SPACING.xs,
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
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
    },
});
