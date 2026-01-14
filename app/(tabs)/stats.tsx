import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl, TouchableOpacity } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { storage } from '../../lib/localDatabase';
import { useAdvancedStats } from '../../hooks/useAdvancedStats';
import { ExerciseProgressWidget } from '../../components/stats/ExerciseHistoryWidget';

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

    const fetchStats = async () => {
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

            // Calculate weekly volume based on session_date
            const today = new Date();
            const dayOfWeek = today.getDay();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            startOfWeek.setHours(0, 0, 0, 0);

            const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
            const volumeByDay: number[] = [0, 0, 0, 0, 0, 0, 0];
            const sessionsByDay: number[] = [0, 0, 0, 0, 0, 0, 0];

            const weekSessions = sessions.filter(s => {
                const sessionDate = new Date(s.session_date);
                return sessionDate >= startOfWeek;
            });

            weekSessions.forEach(session => {
                const sessionDate = new Date(session.session_date);
                let dayIndex = sessionDate.getDay() - 1;
                if (dayIndex < 0) dayIndex = 6;

                sessionsByDay[dayIndex] += 1;

                const sessionLogs = logs.filter(l => l.session_id === session.id && l.is_warmup !== 1 && l.is_warmup !== true);
                const sessionVolume = sessionLogs.reduce((sum, l) => sum + (Number(l.weight_kg) * l.reps), 0);
                volumeByDay[dayIndex] += sessionVolume;
            });

            let todayIndex = today.getDay() - 1;
            if (todayIndex < 0) todayIndex = 6;

            const totalWeekVolume = volumeByDay.reduce((sum, v) => sum + v, 0);
            setHasVolumeData(totalWeekVolume > 0);
            setHasSessionsThisWeek(weekSessions.length > 0);

            setWeeklyVolume(weekDays.map((label, i) => ({
                value: Math.round(volumeByDay[i]),
                label,
                frontColor: i === todayIndex ? COLORS.primary : COLORS.primaryLight,
            })));

            setWeeklySessions(weekDays.map((label, i) => ({
                value: sessionsByDay[i],
                label,
                frontColor: i === todayIndex ? COLORS.success : '#10B98180',
            })));

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleRefresh = () => {
        fetchStats();
        refetchAdvanced();
    };

    const formatHours = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const formatVolume = (kg: number) => {
        if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
        return `${Math.round(kg)} kg`;
    };

    const maxVolume = Math.max(...weeklyVolume.map(v => v.value), 100);
    const topRecords = getTopRecords(5);

    return (
        <View style={styles.container}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={[COLORS.primary + '15', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerSubtitle}>ANALIZA TU</Text>
                        <Text style={styles.headerTitle}>Progreso</Text>
                    </View>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.headerBtnSecondary}
                            onPress={() => router.push('/calendar')}
                        >
                            <LinearGradient
                                colors={COLORS.gradients.secondary}
                                style={styles.headerBtnGradient}
                            >
                                <Ionicons name="calendar" size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={loading || advancedLoading} onRefresh={handleRefresh} tintColor={COLORS.primary} />
                }
            >

                {/* Weekly Activity Chart */}
                <Card title={hasVolumeData ? "Volumen Semanal (kg)" : "Entrenamientos Semanal"}>
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
                                yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
                                xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' }}
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
                                frontColor={COLORS.success}
                                yAxisColor={'transparent'}
                                xAxisColor={COLORS.surfaceHighlight}
                                yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
                                xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' }}
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
                <Card title="Distribución por Grupo Muscular">
                    {muscleGroupStats.length > 0 ? (
                        <View style={styles.chartContainer}>
                            <View style={styles.pieContainer}>
                                <PieChart
                                    data={pieChartData}
                                    donut={true}
                                    showGradient={true}
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
                <Card title="Records Personales 🏆 (1RM Estimado)">
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
                                            {record.weight}kg × {record.reps} reps
                                        </Text>
                                    </View>
                                    <View style={styles.prValue}>
                                        <Text style={styles.pr1RM}>{record.estimated1RM}</Text>
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
                <Card title="Estadísticas Generales">
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Ionicons name="fitness" size={24} color={COLORS.primary} style={styles.statIcon} />
                            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
                            <Text style={styles.statLabel}>Entrenamientos</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="layers" size={24} color={COLORS.success} style={styles.statIcon} />
                            <Text style={styles.statValue}>{stats.totalSets}</Text>
                            <Text style={styles.statLabel}>Series</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="barbell" size={24} color={COLORS.warning} style={styles.statIcon} />
                            <Text style={styles.statValue}>{formatVolume(stats.totalVolume)}</Text>
                            <Text style={styles.statLabel}>Volumen</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="time" size={24} color={COLORS.info} style={styles.statIcon} />
                            <Text style={styles.statValue}>{formatHours(stats.totalMinutes)}</Text>
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
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
        gap: SPACING.lg,
    },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 3,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    headerTitle: {
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    headerBtnSecondary: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    headerBtnGradient: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
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
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
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
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.textPrimary,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    pieCenterLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontWeight: '600',
        marginTop: 4,
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
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    legendValue: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    prList: {
        gap: SPACING.sm,
    },
    prItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        gap: SPACING.md,
    },
    prRank: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    prRankText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.primary,
    },
    prInfo: {
        flex: 1,
    },
    prExercise: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    prDetails: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    prValue: {
        alignItems: 'flex-end',
    },
    pr1RM: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.success,
    },
    prUnit: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
    },
    emptyText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
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
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
});
