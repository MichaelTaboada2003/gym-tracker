import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { useRoutines, RoutineWithExercises } from '../../hooks/useRoutines';
import { Button } from '../../components/ui/Button';

// Helper to format rest time from notes JSON or number
const formatRestTime = (notes: string | null, defaultRest?: number): string => {
    let restSeconds = defaultRest || 90;

    if (notes) {
        try {
            const parsed = JSON.parse(notes);
            if (parsed.restTime) {
                restSeconds = parsed.restTime;
            }
        } catch {
            // Notes is just a regular string, not JSON
            return '';
        }
    }

    if (restSeconds >= 60) {
        const mins = Math.floor(restSeconds / 60);
        const secs = restSeconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
    }
    return `${restSeconds}s`;
};

// Helper to get muscle group color
const getMuscleGroupColor = (muscleGroup: string): string => {
    const colors: Record<string, string> = {
        'Pecho': '#EF4444',
        'Espalda': '#3B82F6',
        'Hombros': '#F59E0B',
        'Bíceps': '#8B5CF6',
        'Tríceps': '#A855F7',
        'Piernas': '#10B981',
        'Core': '#EC4899',
        'Cardio': '#06B6D4',
    };
    return colors[muscleGroup] || COLORS.textMuted;
};

export default function RoutineDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getRoutineDetails } = useRoutines();

    const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadRoutine();
        }
    }, [id]);

    const loadRoutine = async () => {
        setLoading(true);
        const data = await getRoutineDetails(id as string);
        setRoutine(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!routine) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.errorText}>Rutina no encontrada</Text>
                <Button title="Volver" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/routines')} />
            </View>
        );
    }

    // Calculate total sets and volume estimate
    const totalSets = routine.routine_exercises.reduce((sum, re) => sum + re.target_sets, 0);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detalles de Rutina</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Routine Info Card */}
                <LinearGradient
                    colors={[COLORS.surfaceLight, COLORS.surface]}
                    style={styles.routineInfoCard}
                >
                    <Text style={styles.routineName}>{routine.name}</Text>
                    {routine.description && (
                        <Text style={styles.routineDescription}>{routine.description}</Text>
                    )}

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIconBg, { backgroundColor: routine.durationColor + '20' }]}>
                                <Ionicons name="time" size={20} color={routine.durationColor || COLORS.primary} />
                            </View>
                            <Text style={styles.statValue}>{routine.calculatedDuration || routine.estimated_duration}</Text>
                            <Text style={styles.statLabel}>minutos</Text>
                        </View>

                        <View style={styles.statItem}>
                            <View style={[styles.statIconBg, { backgroundColor: COLORS.info + '20' }]}>
                                <Ionicons name="fitness" size={20} color={COLORS.info} />
                            </View>
                            <Text style={styles.statValue}>{routine.routine_exercises.length}</Text>
                            <Text style={styles.statLabel}>ejercicios</Text>
                        </View>

                        <View style={styles.statItem}>
                            <View style={[styles.statIconBg, { backgroundColor: COLORS.success + '20' }]}>
                                <Ionicons name="layers" size={20} color={COLORS.success} />
                            </View>
                            <Text style={styles.statValue}>{totalSets}</Text>
                            <Text style={styles.statLabel}>series</Text>
                        </View>
                    </View>

                    {routine.durationLabel && (
                        <View style={[styles.durationBadge, { backgroundColor: routine.durationColor + '20' }]}>
                            <Ionicons name="speedometer" size={14} color={routine.durationColor} />
                            <Text style={[styles.durationBadgeText, { color: routine.durationColor }]}>
                                Entrenamiento {routine.durationLabel}
                            </Text>
                        </View>
                    )}
                </LinearGradient>

                {/* Exercises Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Ejercicios</Text>
                    <Text style={styles.sectionSubtitle}>{routine.routine_exercises.length} en total</Text>
                </View>

                <View style={styles.exercisesList}>
                    {routine.routine_exercises.map((item, index) => {
                        const muscleColor = getMuscleGroupColor(item.exercise.muscle_group);
                        const restTime = formatRestTime(item.notes, item.exercise.default_rest_seconds);

                        return (
                            <View key={item.id} style={styles.exerciseCard}>
                                {/* Order indicator with muscle group color */}
                                <View style={[styles.exerciseOrder, { backgroundColor: muscleColor + '20' }]}>
                                    <Text style={[styles.orderText, { color: muscleColor }]}>{index + 1}</Text>
                                </View>

                                <View style={styles.exerciseContent}>
                                    {/* Exercise name */}
                                    <Text style={styles.exerciseName}>{item.exercise.name}</Text>

                                    {/* Muscle group badge */}
                                    <View style={[styles.muscleGroupBadge, { backgroundColor: muscleColor + '15' }]}>
                                        <View style={[styles.muscleGroupDot, { backgroundColor: muscleColor }]} />
                                        <Text style={[styles.muscleGroupText, { color: muscleColor }]}>
                                            {item.exercise.muscle_group}
                                        </Text>
                                    </View>

                                    {/* Sets x Reps info */}
                                    <View style={styles.exerciseDetails}>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="repeat" size={14} color={COLORS.primary} />
                                            <Text style={styles.detailText}>
                                                {item.target_sets} Series × {item.target_reps} Reps
                                            </Text>
                                        </View>

                                        {restTime && (
                                            <View style={styles.detailItem}>
                                                <Ionicons name="hourglass-outline" size={14} color={COLORS.warning} />
                                                <Text style={styles.detailText}>
                                                    {restTime} descanso
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Time per rep indicator */}
                                <View style={styles.exerciseTimeHint}>
                                    <Text style={styles.timeHintValue}>{item.exercise.time_per_rep_seconds || 3}s</Text>
                                    <Text style={styles.timeHintLabel}>/rep</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        gap: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    content: {
        padding: SPACING.md,
        paddingBottom: 120,
    },
    errorText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.lg,
    },
    // Routine Info Card
    routineInfoCard: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    routineName: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    routineDescription: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    statValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        gap: SPACING.xs,
    },
    durationBadgeText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    sectionSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },
    // Exercise List
    exercisesList: {
        gap: SPACING.sm,
    },
    exerciseCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        alignItems: 'flex-start',
    },
    exerciseOrder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    orderText: {
        fontWeight: '700',
        fontSize: FONT_SIZES.md,
    },
    exerciseContent: {
        flex: 1,
    },
    exerciseName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    muscleGroupBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
        gap: 4,
    },
    muscleGroupDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    muscleGroupText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    exerciseDetails: {
        gap: 6,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    exerciseTimeHint: {
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
    },
    timeHintValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    timeHintLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
    // Floating Button
    floatingButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.md,
        paddingBottom: SPACING.lg,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
    },
    floatingButton: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    floatingButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        gap: SPACING.sm,
    },
    floatingButtonText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: '#FFF',
    },
});
