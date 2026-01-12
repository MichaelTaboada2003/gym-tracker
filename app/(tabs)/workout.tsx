import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { WorkoutSummaryModal, WorkoutSummaryData } from '../../components/workout/WorkoutSummaryModal';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { useExercises } from '../../hooks/useExercises';
import { useRoutines, RoutineWithExercises } from '../../hooks/useRoutines';
import { formatDuration } from '../../lib/utils';
import { Exercise } from '../../lib/database.types';

// Sample exercises for demo (as fallback)
const SAMPLE_EXERCISES: Exercise[] = [
    { id: '1', name: 'Press Banca', muscle_group: 'Pecho', equipment: 'barbell', notes: null, created_at: '', time_per_rep_seconds: 3, default_rest_seconds: 120 },
    { id: '2', name: 'Sentadilla', muscle_group: 'Piernas', equipment: 'barbell', notes: null, created_at: '', time_per_rep_seconds: 4, default_rest_seconds: 180 },
    { id: '3', name: 'Peso Muerto', muscle_group: 'Espalda', equipment: 'barbell', notes: null, created_at: '', time_per_rep_seconds: 4, default_rest_seconds: 180 },
];

export default function WorkoutScreen() {
    const {
        isActive,
        startedAt,
        exercises,
        routineName,
        startWorkout,
        endWorkout,
        addExercise,
        addSet,
        updateSet,
        removeSet,
        completeSet,
        removeExercise,
        saveWorkout,
        discardWorkout,
        getCompletedSets,
        getTotalVolume,
    } = useWorkoutSession();

    const { exercises: dbExercises, loading: loadingExercises } = useExercises();
    const { routines, loading: loadingRoutines } = useRoutines();
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [showRoutinePicker, setShowRoutinePicker] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState<WorkoutSummaryData | null>(null);
    const [duration, setDuration] = useState(0);

    const availableExercises = dbExercises.length > 0 ? dbExercises : SAMPLE_EXERCISES;

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && startedAt) {
            interval = setInterval(() => {
                setDuration(Math.round((Date.now() - startedAt.getTime()) / 60000));
            }, 60000);
            setDuration(Math.round((Date.now() - startedAt.getTime()) / 60000));
        }
        return () => clearInterval(interval);
    }, [isActive, startedAt]);

    const handleStartWorkout = () => {
        startWorkout();
    };

    const handleFinishWorkout = async () => {
        // Calculate summary data before saving
        const workoutDuration = startedAt
            ? Math.round((Date.now() - startedAt.getTime()) / 60000)
            : 0;

        const totalVolume = getTotalVolume();
        const totalSets = getCompletedSets();
        const totalReps = exercises.reduce((sum, ex) =>
            sum + ex.sets.filter(s => s.isCompleted && !s.isWarmup).reduce((rSum, s) => rSum + s.reps, 0), 0
        );

        // Prepare summary data
        const summary: WorkoutSummaryData = {
            routineName,
            duration: workoutDuration,
            exercises: [...exercises],
            totalVolume,
            totalSets,
            totalReps,
            personalRecords: [], // TODO: Calculate PRs by comparing with previous workouts
        };

        try {
            await saveWorkout();
            // Show summary after successful save
            setSummaryData(summary);
            setShowSummary(true);
        } catch (error) {
            console.error('Error saving workout:', error);
            Alert.alert('Error', 'No se pudo guardar el entrenamiento');
        }
    };

    const handleCloseSummary = () => {
        setShowSummary(false);
        setSummaryData(null);
    };

    const handleStartFromRoutine = (routine: RoutineWithExercises) => {
        // Start workout with routine info
        startWorkout(routine.id, routine.name);

        // Add all exercises from the routine
        routine.routine_exercises.forEach((re) => {
            // Parse rest time from notes JSON if present
            let restSeconds = re.exercise.default_rest_seconds || 90;
            if (re.notes) {
                try {
                    const parsed = JSON.parse(re.notes);
                    if (parsed.restTime) {
                        restSeconds = parsed.restTime;
                    }
                } catch {
                    // Notes is just a regular string
                }
            }

            addExercise({
                ...re.exercise,
                id: re.exercise_id,
            } as any, null, {
                targetSets: re.target_sets,
                targetReps: re.target_reps,
                restSeconds,
                notes: re.notes
            });
        });

        setShowRoutinePicker(false);
    };

    // Exercise picker modal
    const ExercisePickerModal = () => (
        <Modal
            visible={showExercisePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowExercisePicker(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Añadir Ejercicio</Text>
                    <IconButton
                        icon={<Ionicons name="close" size={24} color={COLORS.textSecondary} />}
                        onPress={() => setShowExercisePicker(false)}
                        variant="ghost"
                    />
                </View>
                <FlatList
                    data={availableExercises}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: SPACING.md }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.exerciseItem}
                            onPress={() => {
                                addExercise(item, null);
                                setShowExercisePicker(false);
                            }}
                        >
                            <View>
                                <Text style={styles.exerciseItemName}>{item.name}</Text>
                                <Text style={styles.exerciseItemMuscle}>{item.muscle_group}</Text>
                            </View>
                            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );

    // Routine picker modal
    const RoutinePickerModal = () => (
        <Modal
            visible={showRoutinePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowRoutinePicker(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Seleccionar Rutina</Text>
                    <IconButton
                        icon={<Ionicons name="close" size={24} color={COLORS.textSecondary} />}
                        onPress={() => setShowRoutinePicker(false)}
                        variant="ghost"
                    />
                </View>
                {routines.length === 0 ? (
                    <View style={styles.emptyRoutines}>
                        <Ionicons name="clipboard-outline" size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No tienes rutinas guardadas</Text>
                        <Text style={styles.emptySubtext}>Crea una rutina en la pestaña "Rutinas"</Text>
                    </View>
                ) : (
                    <FlatList
                        data={routines}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: SPACING.md }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.routineItem}
                                onPress={() => handleStartFromRoutine(item)}
                            >
                                <View style={styles.routineItemContent}>
                                    <Text style={styles.routineItemName}>{item.name}</Text>
                                    <Text style={styles.routineItemDetails}>
                                        {item.routine_exercises?.length || 0} ejercicios • ~{item.estimated_duration} min
                                    </Text>
                                </View>
                                <Ionicons name="play-circle" size={32} color={COLORS.primary} />
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </Modal>
    );

    if (!isActive) {
        return (
            <View style={styles.container}>
                <View style={styles.startWorkoutContainer}>
                    <View style={styles.startIconCircle}>
                        <Ionicons name="barbell" size={60} color={COLORS.primary} />
                    </View>
                    <Text style={styles.startTitle}>¿Listo para entrenar?</Text>
                    <Text style={styles.startSubtitle}>
                        Inicia un entrenamiento vacío o selecciona una rutina
                    </Text>
                    <Button
                        title="Seleccionar Rutina"
                        onPress={() => setShowRoutinePicker(true)}
                        size="lg"
                        variant="gradient"
                        style={styles.startButton}
                        icon={<Ionicons name="list" size={20} color="#FFF" />}
                    />
                    <Button
                        title="Entrenamiento Vacío"
                        onPress={handleStartWorkout}
                        size="lg"
                        variant="secondary"
                        style={{ ...styles.startButton, marginTop: SPACING.md }}
                        icon={<Ionicons name="add" size={20} color={COLORS.textPrimary} />}
                    />
                </View>
                <RoutinePickerModal />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Active Workout Header */}
            <View style={styles.workoutHeader}>
                <View style={styles.headerTop}>
                    <Text style={styles.workoutTitle}>
                        {routineName || 'Entrenamiento Libre'}
                    </Text>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>{formatDuration(duration)}</Text>
                    </View>
                </View>

                <View style={styles.headerStats}>
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatLabel}>SETS</Text>
                        <Text style={styles.headerStatValue}>{getCompletedSets()}</Text>
                    </View>
                    <View style={styles.headerDivider} />
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatLabel}>VOLUMEN</Text>
                        <Text style={styles.headerStatValue}>{getTotalVolume().toFixed(0)} <Text style={{ fontSize: 12 }}>kg</Text></Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.exercisesList} contentContainerStyle={styles.exercisesContent}>
                {exercises.length === 0 ? (
                    <View style={styles.emptyExercises}>
                        <Ionicons name="add-circle-outline" size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>Añade tu primer ejercicio</Text>
                    </View>
                ) : (
                    exercises.map((ex, index) => (
                        <ExerciseCard
                            key={ex.exercise.id + index}
                            exercise={ex.exercise}
                            sets={ex.sets}
                            previousBest={ex.previousBest}
                            restSeconds={ex.restSeconds}
                            onUpdateSet={(setIndex, data) => updateSet(index, setIndex, data)}
                            onCompleteSet={(setIndex) => completeSet(index, setIndex)}
                            onAddSet={() => addSet(index)}
                            onRemoveSet={(setIndex) => removeSet(index, setIndex)}
                            onRemoveExercise={() => removeExercise(index)}
                        />
                    ))
                )}

                <Button
                    title="Añadir Ejercicio"
                    variant="secondary"
                    onPress={() => setShowExercisePicker(true)}
                    style={styles.addExerciseButton}
                    icon={<Ionicons name="add" size={18} color={COLORS.textPrimary} />}
                />
            </ScrollView>

            <View style={styles.bottomActions}>
                <Button
                    title="Finalizar Entrenamiento"
                    onPress={handleFinishWorkout}
                    size="lg"
                    variant="gradient"
                    fullWidth
                    icon={<Ionicons name="checkmark-circle" size={20} color="#FFF" />}
                />
            </View>

            <ExercisePickerModal />
            <WorkoutSummaryModal
                visible={showSummary}
                data={summaryData}
                onClose={handleCloseSummary}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    startWorkoutContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    startIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    startTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    startSubtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xxl,
    },
    startButton: {
        width: '100%',
    },
    workoutHeader: {
        backgroundColor: COLORS.surface,
        paddingTop: 50, // Status bar space
        paddingBottom: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    workoutTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red-500 optimized
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.error,
    },
    liveText: {
        color: COLORS.error,
        fontWeight: '700',
        fontSize: 12,
    },
    headerStats: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
    },
    headerStat: {
        flex: 1,
        alignItems: 'center',
    },
    headerDivider: {
        width: 1,
        backgroundColor: COLORS.surfaceHighlight,
    },
    headerStatLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginBottom: 2,
        fontWeight: '600',
    },
    headerStatValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    exercisesList: {
        flex: 1,
    },
    exercisesContent: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
    },
    emptyExercises: {
        alignItems: 'center',
        paddingVertical: SPACING.xxl,
        gap: SPACING.md,
    },
    emptyText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    addExerciseButton: {
        marginTop: SPACING.md,
    },
    bottomActions: {
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    exerciseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        marginBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    exerciseItemName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    exerciseItemMuscle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    emptyRoutines: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        gap: SPACING.md,
    },
    emptySubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    routineItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        marginBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    routineItemContent: {
        flex: 1,
    },
    routineItemName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    routineItemDetails: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
});
