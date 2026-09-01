import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { keepAwake, notifySuccess, releaseKeepAwake } from '../../lib/feedback';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor, HIT_SIZE } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { WorkoutSummaryModal, WorkoutSummaryData } from '../../components/workout/WorkoutSummaryModal';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { useExercises } from '../../hooks/useExercises';
import { useRoutines, RoutineWithExercises } from '../../hooks/useRoutines';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { Exercise } from '../../lib/database.types';
import { formatClock, formatVolumeShort } from '../../lib/utils';
import { showAlert, showConfirm, showDialog } from '../../lib/dialog';

const KEEP_AWAKE_TAG = 'gym-tracker-workout';

export default function WorkoutScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ routineId?: string }>();

    const session = useWorkoutSession();
    const {
        isActive,
        hydrated,
        startedAt,
        exercises,
        routineName,
        restTimer,
        startWorkout,
        addExerciseWithHistory,
        addExercisesWithHistory,
        saveWorkout,
        discardWorkout,
        getCompletedSets,
        getTotalVolume,
        getTotalReps,
        hasUnfinishedSets,
    } = session;

    const { exercises: catalogue } = useExercises();
    const { routines, fetchRoutines } = useRoutines();
    useRefreshOnFocus(fetchRoutines);

    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [showRoutinePicker, setShowRoutinePicker] = useState(false);
    const [summary, setSummary] = useState<WorkoutSummaryData | null>(null);
    const [saving, setSaving] = useState(false);

    /**
     * Keep the screen on while training — but only then.
     *
     * `useKeepAwake()` activates on mount regardless of its tag argument, so a
     * conditional tag would have held the screen awake on the idle tab too.
     */
    useEffect(() => {
        if (!isActive) return;
        keepAwake(KEEP_AWAKE_TAG);
        return () => releaseKeepAwake(KEEP_AWAKE_TAG);
    }, [isActive]);

    const startFromRoutine = useCallback(
        async (routine: RoutineWithExercises) => {
            try {
                setShowRoutinePicker(false);
                startWorkout(routine.id, routine.name);
                await addExercisesWithHistory(
                    routine.routine_exercises.map((slot) => ({
                        exercise: {
                            id: slot.exercise_id,
                            name: slot.exercise.name,
                            muscle_group: slot.exercise.muscle_group,
                            equipment: slot.exercise.equipment,
                            notes: null,
                            created_at: '',
                            time_per_rep_seconds: slot.time_per_rep_seconds,
                            default_rest_seconds: slot.exercise.default_rest_seconds,
                        } satisfies Exercise,
                        overrides: {
                            targetSets: slot.target_sets,
                            targetReps: slot.target_reps,
                            restSeconds: slot.rest_seconds,
                            notes: slot.notes,
                        },
                    }))
                );
                notifySuccess();
            } catch (error) {
                console.error('[workout] could not start routine:', error);
                showAlert('Error', 'No se pudo iniciar la rutina');
            }
        },
        [addExercisesWithHistory, startWorkout]
    );

    /**
     * `/workout?routineId=…` starts that routine directly, so routine and plan
     * screens can launch a session without making the user re-pick it here.
     *
     * The ref is what actually guarantees "once": clearing the param is a
     * navigation request, and until it lands the effect would otherwise re-fire
     * and restart the routine the moment the previous session ended.
     */
    const handledRoutineRef = useRef<string | null>(null);
    useEffect(() => {
        const routineId = params.routineId;
        if (!routineId || isActive || !hydrated || routines.length === 0) return;
        if (handledRoutineRef.current === routineId) return;

        const routine = routines.find((r) => r.id === routineId);
        if (!routine) return;

        handledRoutineRef.current = routineId;
        router.setParams({ routineId: undefined });
        void startFromRoutine(routine);
    }, [params.routineId, isActive, hydrated, routines, router, startFromRoutine]);

    const finishWorkout = async () => {
        const completed = getCompletedSets();
        if (completed === 0) {
            showDialog({
                title: 'Sin series completadas',
                message: 'Marca al menos una serie antes de finalizar.',
                actions: [
                    { label: 'Descartar entrenamiento', style: 'destructive', onPress: confirmDiscard },
                    { label: 'Seguir entrenando', style: 'cancel' },
                ],
            });
            return;
        }

        const proceed = async () => {
            try {
                setSaving(true);
                const totalVolume = getTotalVolume();
                const totalReps = getTotalReps();
                const durationMinutes = startedAt
                    ? Math.max(1, Math.round((Date.now() - startedAt) / 60_000))
                    : 1;
                const snapshot = { routineName, exercises: [...exercises] };

                const saved = await saveWorkout();
                if (!saved) {
                    // Every completed set had 0 reps, so there was nothing to store.
                    showAlert('Nada que guardar', 'Las series marcadas no tienen repeticiones.');
                    return;
                }

                setSummary({
                    routineName: snapshot.routineName,
                    duration: saved.session.duration_minutes ?? durationMinutes,
                    exercises: snapshot.exercises,
                    totalVolume,
                    totalSets: completed,
                    totalReps,
                    personalRecords: saved.personalRecords,
                });
                notifySuccess();
            } catch (error) {
                console.error('[workout] save failed:', error);
                showAlert('Error', 'No se pudo guardar el entrenamiento. Inténtalo de nuevo.');
            } finally {
                setSaving(false);
            }
        };

        // Warn about half-finished work instead of silently dropping it.
        if (hasUnfinishedSets()) {
            showDialog({
                title: 'Series sin marcar',
                message: 'Hay series que no marcaste como completadas. No se guardarán.',
                actions: [
                    { label: 'Finalizar igual', onPress: proceed },
                    { label: 'Seguir entrenando', style: 'cancel' },
                ],
            });
            return;
        }

        await proceed();
    };

    const confirmDiscard = () => {
        showConfirm({
            title: 'Descartar entrenamiento',
            message: 'Se perderán las series registradas. Esta acción no se puede deshacer.',
            confirmLabel: 'Descartar',
            onConfirm: discardWorkout,
        });
    };

    // ── Idle state ────────────────────────────────────────────────────────────
    if (!hydrated) {
        return <View style={styles.container} />;
    }

    if (!isActive) {
        return (
            <View style={[styles.container, styles.startContainer, { paddingTop: insets.top + SPACING.xl }]}>
                <View style={styles.startIconCircle}>
                    <Ionicons name="barbell" size={56} color={COLORS.primary} />
                </View>
                <Text style={styles.startTitle}>¿Listo para entrenar?</Text>
                <Text style={styles.startSubtitle}>
                    Empieza con una de tus rutinas o crea un entrenamiento sobre la marcha.
                </Text>

                <Button
                    title="Empezar con una rutina"
                    onPress={() => setShowRoutinePicker(true)}
                    size="lg"
                    variant="gradient"
                    fullWidth
                    icon={<Ionicons name="list" size={20} color={COLORS.onChalk} />}
                />
                <Button
                    title="Entrenamiento libre"
                    onPress={() => startWorkout()}
                    size="lg"
                    variant="secondary"
                    fullWidth
                    style={{ marginTop: SPACING.md }}
                    icon={<Ionicons name="add" size={20} color={COLORS.textPrimary} />}
                />

                <RoutinePicker
                    visible={showRoutinePicker}
                    routines={routines}
                    onSelect={startFromRoutine}
                    onClose={() => setShowRoutinePicker(false)}
                />
                <WorkoutSummaryModal visible={summary !== null} data={summary} onClose={() => setSummary(null)} />
            </View>
        );
    }

    // ── Active session ────────────────────────────────────────────────────────
    const completedSets = getCompletedSets();
    const totalVolume = getTotalVolume();

    return (
        <View style={styles.container}>
            <View style={[styles.workoutHeader, { paddingTop: insets.top + SPACING.sm }]}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleBlock}>
                        <Text style={styles.workoutTitle} numberOfLines={1}>
                            {routineName || 'Entrenamiento libre'}
                        </Text>
                        <SessionClock startedAt={startedAt} />
                    </View>

                    <TouchableOpacity
                        onPress={confirmDiscard}
                        style={styles.discardButton}
                        accessibilityRole="button"
                        accessibilityLabel="Descartar entrenamiento"
                    >
                        <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerStats}>
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatValue}>{completedSets}</Text>
                        <Text style={styles.headerStatLabel}>Series</Text>
                    </View>
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatValue}>{formatVolumeShort(totalVolume)}</Text>
                        <Text style={styles.headerStatLabel}>Volumen kg</Text>
                    </View>
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatValue}>{exercises.length}</Text>
                        <Text style={styles.headerStatLabel}>Ejercicios</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.exercisesList}
                contentContainerStyle={styles.exercisesContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {exercises.length === 0 ? (
                    <EmptyState
                        icon="add-circle-outline"
                        title="Todavía no hay ejercicios"
                        message="Añade el primero para empezar a registrar series."
                        actionLabel="Añadir ejercicio"
                        onAction={() => setShowExercisePicker(true)}
                    />
                ) : (
                    exercises.map((item, index) => (
                        <ExerciseCard
                            key={`${item.exercise.id}-${index}`}
                            item={item}
                            index={index}
                            isFirst={index === 0}
                            isLast={index === exercises.length - 1}
                            restTimer={restTimer?.exerciseIndex === index ? restTimer : null}
                        />
                    ))
                )}

                {exercises.length > 0 && (
                    <Button
                        title="Añadir Ejercicio"
                        variant="secondary"
                        onPress={() => setShowExercisePicker(true)}
                        fullWidth
                        icon={<Ionicons name="add" size={18} color={COLORS.textPrimary} />}
                    />
                )}
            </ScrollView>

            <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
                <Button
                    title="Finalizar Entrenamiento"
                    onPress={finishWorkout}
                    loading={saving}
                    size="lg"
                    variant="gradient"
                    fullWidth
                    icon={<Ionicons name="checkmark-circle" size={20} color={COLORS.onChalk} />}
                />
            </View>

            <ExercisePicker
                visible={showExercisePicker}
                exercises={catalogue}
                onSelect={async (exercise) => {
                    setShowExercisePicker(false);
                    await addExerciseWithHistory(exercise);
                }}
                onClose={() => setShowExercisePicker(false)}
            />
            <WorkoutSummaryModal visible={summary !== null} data={summary} onClose={() => setSummary(null)} />
        </View>
    );
}

/**
 * The running session timer.
 *
 * Kept as its own component on purpose: ticking it in the screen re-rendered
 * every exercise card (and every text input inside them) once per second.
 */
function SessionClock({ startedAt }: { startedAt: number | null }) {
    const [elapsed, setElapsed] = useState(() =>
        startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0
    );

    useEffect(() => {
        if (!startedAt) return;
        const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [startedAt]);

    return (
        <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{formatClock(elapsed)}</Text>
        </View>
    );
}

// =============================================================================
// Pickers
//
// Declared at module scope. Defining them inside the screen created a brand-new
// component type on every render, so React unmounted and remounted the modal —
// losing the search text and the list position on each keystroke.
// =============================================================================

function ExercisePicker({
    visible,
    exercises,
    onSelect,
    onClose,
}: {
    visible: boolean;
    exercises: Exercise[];
    onSelect: (exercise: Exercise) => void;
    onClose: () => void;
}) {
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!visible) setQuery('');
    }, [visible]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return exercises;
        return exercises.filter(
            (e) =>
                e.name.toLowerCase().includes(needle) ||
                e.muscle_group.toLowerCase().includes(needle) ||
                e.equipment.toLowerCase().includes(needle)
        );
    }, [exercises, query]);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Añadir ejercicio</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalClose} accessibilityLabel="Cerrar">
                        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* A 32-exercise catalogue is unusable without search. */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color={COLORS.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por nombre, músculo o material…"
                        placeholderTextColor={COLORS.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Limpiar búsqueda">
                            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.modalListContent}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <EmptyState
                            icon="search-outline"
                            title="Sin resultados"
                            message={`Ningún ejercicio coincide con "${query}".`}
                        />
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.pickerItem} onPress={() => onSelect(item)}>
                            <View
                                style={[styles.pickerAccent, { backgroundColor: getMuscleColor(item.muscle_group) }]}
                            />
                            <View style={styles.pickerItemBody}>
                                <Text style={styles.pickerItemName}>{item.name}</Text>
                                <Text style={styles.pickerItemMeta}>
                                    {item.muscle_group}
                                    {item.equipment ? ` · ${item.equipment}` : ''}
                                </Text>
                            </View>
                            <Ionicons name="add-circle" size={26} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );
}

function RoutinePicker({
    visible,
    routines,
    onSelect,
    onClose,
}: {
    visible: boolean;
    routines: RoutineWithExercises[];
    onSelect: (routine: RoutineWithExercises) => void;
    onClose: () => void;
}) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Elegir rutina</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalClose} accessibilityLabel="Cerrar">
                        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={routines}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.modalListContent}
                    ListEmptyComponent={
                        <EmptyState
                            icon="clipboard-outline"
                            title="Aún no tienes rutinas"
                            message='Créalas en la pestaña "Rutinas" para empezar con un plan listo.'
                        />
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.pickerItem} onPress={() => onSelect(item)}>
                            <View style={styles.pickerAccent} />
                            <View style={styles.pickerItemBody}>
                                <Text style={styles.pickerItemName}>{item.name}</Text>
                                <Text style={styles.pickerItemMeta}>
                                    {item.routine_exercises.length} ejercicios · ~{item.calculatedDuration} min
                                </Text>
                            </View>
                            <Ionicons name="play-circle" size={32} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    startContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    startIconCircle: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    startTitle: {
        fontSize: FONT_SIZES.xl,
        fontFamily: FONTS.display,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    startSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 20,
    },
    workoutHeader: {
        backgroundColor: COLORS.surface,
        paddingBottom: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.sm,
    },
    headerTitleBlock: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    workoutTitle: {
        flexShrink: 1,
        fontFamily: FONTS.display,
        fontSize: 21,
        letterSpacing: 0.2,
        color: COLORS.textPrimary,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.error,
    },
    liveText: {
        fontFamily: FONTS.display,
        fontSize: 15,
        color: COLORS.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    discardButton: {
        width: HIT_SIZE,
        height: HIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: HIT_SIZE / 2,
    },
    headerStats: {
        flexDirection: 'row',
        marginTop: SPACING.md,
    },
    headerStat: {
        flex: 1,
    },
    headerStatLabel: {
        fontFamily: FONTS.medium,
        fontSize: 9,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        marginTop: 1,
    },
    headerStatValue: {
        fontFamily: FONTS.display,
        fontSize: 30,
        lineHeight: 32,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    exercisesList: {
        flex: 1,
    },
    exercisesContent: {
        padding: SPACING.md,
        paddingBottom: SPACING.xl,
    },
    bottomActions: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
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
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
    },
    modalClose: {
        width: HIT_SIZE,
        height: HIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalListContent: {
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        margin: SPACING.md,
        marginBottom: 0,
        paddingHorizontal: SPACING.md,
        height: 46,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        gap: SPACING.md,
        overflow: 'hidden',
    },
    pickerAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: COLORS.surfaceHighlight,
    },
    pickerItemBody: {
        flex: 1,
    },
    pickerItemName: {
        fontSize: FONT_SIZES.md,
        fontFamily: FONTS.semibold,
        color: COLORS.textPrimary,
    },
    pickerItemMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
});
