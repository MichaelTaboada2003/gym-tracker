import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { useRoutines, RoutineWithExercises } from '../../hooks/useRoutines';
import { Button } from '../../components/ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';

export default function RoutineDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getRoutineDetails } = useRoutines();
    const { startWorkout, addExercise } = useWorkoutStore();

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

    const handleStartWorkout = () => {
        if (!routine) return;

        // 1. Initialize workout
        startWorkout(routine.id, routine.name);

        // 2. Add exercises from routine
        routine.routine_exercises.forEach((re) => {
            addExercise({
                ...re.exercise,
                id: re.exercise_id,
            } as any, null, {
                targetSets: re.target_sets,
                targetReps: re.target_reps,
                notes: re.notes
            });
        });

        // 3. Navigate to workout tab
        router.push('/(tabs)/workout');
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
                <Text style={styles.errorText}>Rutina no encontrada</Text>
                <Button title="Volver" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/routines')} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detalles de Rutina</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.routineHeader}>
                    <Text style={styles.routineName}>{routine.name}</Text>
                    {routine.description && (
                        <Text style={styles.routineDescription}>{routine.description}</Text>
                    )}

                    <View style={styles.statsRow}>
                        <View style={styles.statBadge}>
                            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.statText}>~{routine.estimated_duration} min</Text>
                        </View>
                        <View style={styles.statBadge}>
                            <Ionicons name="barbell-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.statText}>{routine.routine_exercises.length} Ejercicios</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Ejercicios</Text>

                <View style={styles.exercisesList}>
                    {routine.routine_exercises.map((item, index) => (
                        <View key={item.id} style={styles.exerciseCard}>
                            <View style={styles.exerciseOrder}>
                                <Text style={styles.orderText}>{index + 1}</Text>
                            </View>

                            <View style={styles.exerciseContent}>
                                <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                                <Text style={styles.muscleGroup}>{item.exercise.muscle_group}</Text>

                                <View style={styles.exerciseTargets}>
                                    <Text style={styles.targetText}>
                                        {item.target_sets} Series x {item.target_reps} Reps
                                    </Text>
                                    {item.notes && (
                                        <Text style={styles.exerciseNotes}>{item.notes}</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))}
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
        paddingBottom: 100,
    },
    errorText: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    routineHeader: {
        marginBottom: SPACING.xl,
    },
    routineName: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    routineDescription: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        lineHeight: 24,
        marginBottom: SPACING.md,
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.md,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    statText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    exercisesList: {
        gap: SPACING.md,
    },
    exerciseCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    exerciseOrder: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    orderText: {
        color: COLORS.textPrimary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    exerciseContent: {
        flex: 1,
    },
    exerciseName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    muscleGroup: {
        fontSize: 12,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        marginBottom: SPACING.sm,
    },
    exerciseTargets: {
        flexDirection: 'column',
        gap: 4,
    },
    targetText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.info, // Use info color for targets
        fontWeight: '500',
    },
    exerciseNotes: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    footer: {
        padding: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
        backgroundColor: COLORS.background,
    },
});
