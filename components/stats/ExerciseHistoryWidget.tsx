/**
 * ExerciseProgressWidget - Compact widget with exercise selector and expandable detail modal
 * 
 * Similar design to BodyWeightWidget but for tracking exercise progress
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { storage } from '../../lib/localDatabase';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { parseISODate, toISODate } from '../../lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type DateRange = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

interface ExerciseData {
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    history: { date: string; weight: number; reps: number; volume: number }[];
}

interface ExerciseStats {
    current: number;
    change: number;
    min: number;
    max: number;
    totalSets: number;
}

// Muscle group colors
const MUSCLE_COLORS: Record<string, string> = {
    'Pecho': '#EF4444',
    'Espalda': '#3B82F6',
    'Hombros': '#F59E0B',
    'Bíceps': '#8B5CF6',
    'Tríceps': '#A855F7',
    'Piernas': '#10B981',
    'Core': '#EC4899',
    'Cardio': '#06B6D4',
};

export function ExerciseProgressWidget() {
    const [exercises, setExercises] = useState<ExerciseData[]>([]);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>('1m');
    const [showModal, setShowModal] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchExerciseData = useCallback(async () => {
        try {
            const [logs, exercisesData, sessions] = await Promise.all([
                storage.workoutLogs.getAll(),
                storage.exercises.getAll(),
                storage.workoutSessions.getAll(),
            ]);

            // Indexed lookups: the previous `.find()` inside the loop made this
            // O(logs × exercises) and crawled once a few months of data existed.
            const exercisesById = new Map(exercisesData.map((e) => [e.id, e]));
            const sessionDates = new Map(sessions.map((s) => [s.id, s.session_date]));

            const workLogs = logs.filter((l) => !l.is_warmup);
            const exerciseMap = new Map<string, ExerciseData>();

            workLogs.forEach(log => {
                const exercise = exercisesById.get(log.exercise_id);
                if (!exercise) return;

                const sessionDate = sessionDates.get(log.session_id) || toISODate();

                if (!exerciseMap.has(log.exercise_id)) {
                    exerciseMap.set(log.exercise_id, {
                        exerciseId: log.exercise_id,
                        exerciseName: exercise.name,
                        muscleGroup: exercise.muscle_group,
                        history: [],
                    });
                }

                const data = exerciseMap.get(log.exercise_id)!;
                data.history.push({
                    date: sessionDate,
                    weight: Number(log.weight_kg),
                    reps: log.reps,
                    volume: Number(log.weight_kg) * log.reps,
                });
            });

            // Process history - get max weight per session date
            const processedExercises = Array.from(exerciseMap.values())
                .map(ex => {
                    const dateMap = new Map<string, { weight: number; reps: number; volume: number }>();
                    ex.history.forEach(h => {
                        const existing = dateMap.get(h.date);
                        if (!existing || h.weight > existing.weight) {
                            dateMap.set(h.date, { weight: h.weight, reps: h.reps, volume: h.volume });
                        }
                    });

                    // ISO dates sort correctly as plain strings, and unlike
                    // `new Date('YYYY-MM-DD')` this does not shift into UTC.
                    const history = Array.from(dateMap.entries())
                        .map(([date, data]) => ({ date, ...data }))
                        .sort((a, b) => a.date.localeCompare(b.date));

                    return { ...ex, history };
                })
                .filter(ex => ex.history.length > 0)
                .sort((a, b) => {
                    // Sort by most recent activity
                    const aLast = a.history[a.history.length - 1]?.date || '';
                    const bLast = b.history[b.history.length - 1]?.date || '';
                    return bLast.localeCompare(aLast);
                });

            setExercises(processedExercises);
            // Default to the most recently trained exercise, but never override
            // a pick the user already made.
            setSelectedExerciseId((current) =>
                current && processedExercises.some((e) => e.exerciseId === current)
                    ? current
                    : (processedExercises[0]?.exerciseId ?? null)
            );
        } catch (error) {
            console.error('[exercise-progress] load failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchExerciseData();
    }, [fetchExerciseData]);

    useRefreshOnFocus(fetchExerciseData);

    const selectedExercise = useMemo(() => {
        return exercises.find(e => e.exerciseId === selectedExerciseId);
    }, [exercises, selectedExerciseId]);

    const getFilteredHistory = (range: DateRange) => {
        if (!selectedExercise) return [];

        const now = new Date();
        let cutoffDate = new Date();

        switch (range) {
            case '7d': cutoffDate.setDate(now.getDate() - 7); break;
            case '1m': cutoffDate.setMonth(now.getMonth() - 1); break;
            case '3m': cutoffDate.setMonth(now.getMonth() - 3); break;
            case '6m': cutoffDate.setMonth(now.getMonth() - 6); break;
            case '1y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
            case 'all': return selectedExercise.history;
        }

        return selectedExercise.history.filter(h => parseISODate(h.date) >= cutoffDate);
    };

    const getStats = (range: DateRange): ExerciseStats => {
        const history = getFilteredHistory(range);
        if (history.length === 0) {
            return { current: 0, change: 0, min: 0, max: 0, totalSets: 0 };
        }

        const weights = history.map(h => h.weight);
        const current = weights[weights.length - 1];
        const first = weights[0];
        const change = current - first;

        return {
            current,
            change,
            min: Math.min(...weights),
            max: Math.max(...weights),
            totalSets: history.length,
        };
    };

    const filteredHistory = getFilteredHistory(dateRange);
    const stats = getStats(dateRange);
    const color = selectedExercise ? (MUSCLE_COLORS[selectedExercise.muscleGroup] || COLORS.primary) : COLORS.primary;

    const chartData = useMemo(() => {
        return filteredHistory.map((h, i) => {
            const date = parseISODate(h.date);
            return {
                value: h.weight,
                label: `${date.getDate()}/${date.getMonth() + 1}`,
                dataPointText: i === filteredHistory.length - 1 ? `${h.weight}` : '',
            };
        });
    }, [filteredHistory]);

    const formatDate = (dateStr: string) => {
        const date = parseISODate(dateStr);
        const day = date.toLocaleDateString('es', { weekday: 'short' });
        const dayNum = date.getDate();
        const month = date.toLocaleDateString('es', { month: 'short' });
        return `${day}, ${dayNum} ${month}`;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Cargando ejercicios...</Text>
            </View>
        );
    }

    if (exercises.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="barbell-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Sin ejercicios registrados</Text>
                <Text style={styles.emptySubtext}>Completa entrenamientos para ver tu progreso</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Title */}
            <View style={styles.titleRow}>
                <Ionicons name="trending-up" size={20} color={COLORS.primary} />
                <Text style={styles.title}>Progreso por Ejercicio</Text>
            </View>

            {/* Exercise Selector Button */}
            <TouchableOpacity
                style={[styles.exerciseSelector, { borderColor: color + '50' }]}
                onPress={() => setShowExercisePicker(true)}
            >
                <View style={[styles.selectorDot, { backgroundColor: color }]} />
                <View style={styles.selectorInfo}>
                    <Text style={styles.selectorText} numberOfLines={1}>
                        {selectedExercise?.exerciseName || 'Seleccionar ejercicio'}
                    </Text>
                    <Text style={[styles.selectorMuscle, { color }]}>
                        {selectedExercise?.muscleGroup || ''}
                    </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View style={styles.statHeader}>
                        <Ionicons name="barbell" size={14} color={COLORS.primary} />
                        <Text style={styles.statLabel}>ACTUAL</Text>
                    </View>
                    <Text style={styles.statValue}>
                        {stats.current}
                        <Text style={styles.statUnit}> kg</Text>
                    </Text>
                </View>
                <View style={[styles.statCard, stats.change >= 0 ? styles.statCardSuccess : styles.statCardError]}>
                    <View style={styles.statHeader}>
                        <Ionicons
                            name={stats.change >= 0 ? "trending-up" : "trending-down"}
                            size={14}
                            color={stats.change >= 0 ? COLORS.success : COLORS.error}
                        />
                        <Text style={styles.statLabel}>CAMBIO</Text>
                    </View>
                    <Text style={[styles.statValue, { color: stats.change >= 0 ? COLORS.success : COLORS.error }]}>
                        {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(1)}
                        <Text style={[styles.statUnit, { color: stats.change >= 0 ? COLORS.success : COLORS.error }]}> kg</Text>
                    </Text>
                </View>
            </View>

            {/* Chart */}
            <TouchableOpacity
                style={styles.chartContainer}
                onPress={() => setShowModal(true)}
                activeOpacity={0.8}
            >
                {chartData.length > 1 ? (
                    <View style={styles.chartWrapper}>
                        <LineChart
                            data={chartData}
                            width={SCREEN_WIDTH - SPACING.lg * 5}
                            height={120}
                            hideDataPoints={false}
                            dataPointsColor={color}
                            dataPointsRadius={3}
                            color={color}
                            thickness={2}
                            curved
                            isAnimated
                            animationDuration={500}
                            initialSpacing={10}
                            endSpacing={10}
                            spacing={(SCREEN_WIDTH - SPACING.lg * 5 - 40) / Math.max(chartData.length - 1, 1)}
                            areaChart
                            startFillColor={color + '40'}
                            endFillColor={color + '05'}
                            startOpacity={0.4}
                            endOpacity={0}
                            yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                            xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 9, marginTop: 4 }}
                            yAxisColor={COLORS.surfaceHighlight}
                            xAxisColor={COLORS.surfaceHighlight}
                            rulesColor={COLORS.surfaceHighlight}
                            rulesType="dashed"
                            noOfSections={3}
                            yAxisLabelSuffix=""
                            showVerticalLines={false}
                            xAxisLabelsVerticalShift={2}
                        />
                    </View>
                ) : (
                    <View style={styles.noChartData}>
                        <Ionicons name="analytics-outline" size={40} color={COLORS.textMuted} />
                        <Text style={styles.noChartText}>Necesitas más datos para ver el gráfico</Text>
                        <Text style={styles.noChartSubtitle}>Registra entrenamientos para ver tu progreso</Text>
                    </View>
                )}
                <View style={styles.expandHint}>
                    <Text style={styles.expandHintText}>Toca para ver detalles</Text>
                    <Ionicons name="expand-outline" size={14} color={COLORS.primary} />
                </View>
            </TouchableOpacity>

            {/* Exercise Picker Modal */}
            <Modal
                visible={showExercisePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowExercisePicker(false)}
            >
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Seleccionar Ejercicio</Text>
                            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {exercises.map(ex => {
                                const exColor = MUSCLE_COLORS[ex.muscleGroup] || COLORS.primary;
                                const isSelected = ex.exerciseId === selectedExerciseId;
                                return (
                                    <TouchableOpacity
                                        key={ex.exerciseId}
                                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                                        onPress={() => {
                                            setSelectedExerciseId(ex.exerciseId);
                                            setShowExercisePicker(false);
                                        }}
                                    >
                                        <View style={[styles.pickerDot, { backgroundColor: exColor }]} />
                                        <View style={styles.pickerItemInfo}>
                                            <Text style={[styles.pickerItemName, isSelected && styles.pickerItemNameSelected]}>
                                                {ex.exerciseName}
                                            </Text>
                                            <Text style={styles.pickerItemMeta}>
                                                {ex.muscleGroup} • {ex.history.length} sesiones
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Detail Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalContainer}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Historial de {selectedExercise?.exerciseName}</Text>
                        <TouchableOpacity onPress={() => setShowModal(false)}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalContent}>
                        {/* Date Range Selector */}
                        <View style={styles.rangeSelector}>
                            {(['7d', '1m', '3m', '6m', '1y', 'all'] as DateRange[]).map(range => (
                                <TouchableOpacity
                                    key={range}
                                    style={[styles.rangeBtn, dateRange === range && styles.rangeBtnActive]}
                                    onPress={() => setDateRange(range)}
                                >
                                    <Text style={[styles.rangeBtnText, dateRange === range && styles.rangeBtnTextActive]}>
                                        {range === 'all' ? 'Todo' : range.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Full Stats Grid */}
                        <View style={styles.fullStatsGrid}>
                            <View style={styles.fullStatCard}>
                                <Text style={styles.fullStatLabel}>ACTUAL</Text>
                                <Text style={styles.fullStatValue}>{stats.current} kg</Text>
                            </View>
                            <View style={styles.fullStatCard}>
                                <Text style={styles.fullStatLabel}>CAMBIO</Text>
                                <Text style={[styles.fullStatValue, { color: stats.change >= 0 ? COLORS.success : COLORS.error }]}>
                                    {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(1)} kg
                                </Text>
                            </View>
                            <View style={styles.fullStatCard}>
                                <Text style={styles.fullStatLabel}>MÍNIMO</Text>
                                <Text style={styles.fullStatValue}>{stats.min} kg</Text>
                            </View>
                            <View style={styles.fullStatCard}>
                                <Text style={styles.fullStatLabel}>MÁXIMO</Text>
                                <Text style={styles.fullStatValue}>{stats.max} kg</Text>
                            </View>
                        </View>

                        {/* Full Chart */}
                        <View style={styles.fullChartContainer}>
                            {chartData.length > 1 ? (
                                <LineChart
                                    data={chartData}
                                    width={SCREEN_WIDTH - SPACING.md * 4 - 40}
                                    height={180}
                                    spacing={(SCREEN_WIDTH - SPACING.md * 4 - 60) / Math.max(chartData.length - 1, 1)}
                                    thickness={2}
                                    color={color}
                                    hideDataPoints={false}
                                    dataPointsColor={color}
                                    dataPointsRadius={4}
                                    curved
                                    isAnimated
                                    animationDuration={500}
                                    initialSpacing={15}
                                    endSpacing={15}
                                    areaChart
                                    startFillColor={color + '40'}
                                    endFillColor={color + '05'}
                                    startOpacity={0.4}
                                    endOpacity={0}
                                    yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                                    xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 9 }}
                                    yAxisColor={COLORS.surfaceHighlight}
                                    xAxisColor={COLORS.surfaceHighlight}
                                    rulesColor={COLORS.surfaceHighlight}
                                    rulesType="dashed"
                                    noOfSections={4}
                                    showVerticalLines={false}
                                    xAxisLabelsVerticalShift={2}
                                />
                            ) : (
                                <View style={styles.noChartDataFull}>
                                    <Ionicons name="analytics-outline" size={48} color={COLORS.textMuted} />
                                    <Text style={styles.noChartTextFull}>No hay suficientes datos para este período</Text>
                                    <Text style={styles.noChartSubtext}>Registra más entrenamientos para ver el progreso</Text>
                                </View>
                            )}
                        </View>

                        {/* Recent Records */}
                        <View style={styles.recordsSection}>
                            <Text style={styles.recordsTitle}>Registros Recientes</Text>
                            {filteredHistory.slice().reverse().slice(0, 10).map((entry, i) => (
                                <View key={i} style={styles.recordItem}>
                                    <Text style={styles.recordDate}>{formatDate(entry.date)}</Text>
                                    <View style={styles.recordValues}>
                                        <Text style={styles.recordWeight}>{entry.weight} kg</Text>
                                        <Text style={styles.recordReps}>×{entry.reps}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: SPACING.md,
    },
    loadingContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    loadingText: {
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
        gap: SPACING.sm,
    },
    emptyText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        fontFamily: FONTS.semibold,
    },
    emptySubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
    },
    exerciseSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    selectorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    selectorInfo: {
        flex: 1,
    },
    selectorText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontFamily: FONTS.semibold,
    },
    selectorMuscle: {
        fontSize: FONT_SIZES.xs,
        fontFamily: FONTS.medium,
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontFamily: FONTS.semibold,
        letterSpacing: 1,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 24,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
    },
    statUnit: {
        fontSize: FONT_SIZES.sm,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    statCardSuccess: {
        borderWidth: 1,
        borderColor: COLORS.success + '30',
    },
    statCardError: {
        borderWidth: 1,
        borderColor: COLORS.error + '30',
    },
    chartContainer: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
    },
    chartWrapper: {
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
    },
    chartDateRange: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: SPACING.xs,
        marginTop: SPACING.sm,
    },
    chartDateText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        fontFamily: FONTS.medium,
    },
    noChartData: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    noChartText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontFamily: FONTS.semibold,
    },
    noChartSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    expandHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: SPACING.md,
    },
    expandHintText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    expandIcon: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Picker Modal
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        maxHeight: '70%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    pickerTitle: {
        fontSize: FONT_SIZES.lg,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
    },
    pickerList: {
        padding: SPACING.md,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    pickerItemSelected: {
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    pickerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    pickerItemInfo: {
        flex: 1,
    },
    pickerItemName: {
        fontSize: FONT_SIZES.md,
        fontFamily: FONTS.semibold,
        color: COLORS.textPrimary,
    },
    pickerItemNameSelected: {
        color: COLORS.primary,
    },
    pickerItemMeta: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    // Detail Modal
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
        flex: 1,
    },
    modalContent: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
    },
    rangeSelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: 4,
        marginBottom: SPACING.lg,
    },
    rangeBtn: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    rangeBtnActive: {
        backgroundColor: COLORS.primary,
    },
    rangeBtnText: {
        fontSize: FONT_SIZES.sm,
        fontFamily: FONTS.semibold,
        color: COLORS.textSecondary,
    },
    rangeBtnTextActive: {
        color: '#FFF',
    },
    fullStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    fullStatCard: {
        width: '48%',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
    },
    fullStatLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontFamily: FONTS.semibold,
        letterSpacing: 1,
        marginBottom: 4,
    },
    fullStatValue: {
        fontSize: FONT_SIZES.xl,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
    },
    fullChartContainer: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        alignItems: 'center',
    },
    noChartDataFull: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    noChartTextFull: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        fontFamily: FONTS.semibold,
    },
    noChartSubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    recordsSection: {
        marginTop: SPACING.sm,
    },
    recordsTitle: {
        fontSize: FONT_SIZES.md,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    recordItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    recordDate: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    recordValues: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordWeight: {
        fontSize: FONT_SIZES.lg,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
    },
    recordReps: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginLeft: 4,
    },
});
