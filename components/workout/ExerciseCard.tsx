import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, getMuscleColor } from '../../constants/colors';
import { ExerciseInProgress, RestTimerState, useWorkoutStore } from '../../store/workoutStore';
import { SetRow } from './SetRow';
import { Button } from '../ui/Button';
import { formatClock, formatSeconds, formatWeight } from '../../lib/utils';

interface ExerciseCardProps {
    item: ExerciseInProgress;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    /** The session-wide timer, if it currently belongs to this exercise. */
    restTimer: RestTimerState | null;
}

const secondsLeft = (endsAt: number) => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

/**
 * Memoised: the screen re-renders on every keystroke, and store updates replace
 * only the exercise that actually changed, so untouched cards keep their
 * identity and skip rendering entirely.
 *
 * Actions are read straight from the store — zustand keeps those references
 * stable, which inline `onX` props from the parent would not.
 */
export const ExerciseCard = React.memo(function ExerciseCard({
    item,
    index,
    isFirst,
    isLast,
    restTimer,
}: ExerciseCardProps) {
    const updateSet = useWorkoutStore((state) => state.updateSet);
    const toggleSet = useWorkoutStore((state) => state.toggleSet);
    const addSet = useWorkoutStore((state) => state.addSet);
    const removeSet = useWorkoutStore((state) => state.removeSet);
    const removeExercise = useWorkoutStore((state) => state.removeExercise);
    const moveExercise = useWorkoutStore((state) => state.moveExercise);
    const startRest = useWorkoutStore((state) => state.startRest);
    const adjustRest = useWorkoutStore((state) => state.adjustRest);
    const stopRest = useWorkoutStore((state) => state.stopRest);

    const { exercise, sets, previousBest, targetSets, targetReps, restSeconds, notes } = item;

    const workSets = sets.filter((s) => !s.isWarmup);
    const completedSets = workSets.filter((s) => s.isCompleted).length;
    const progress = workSets.length > 0 ? (completedSets / workSets.length) * 100 : 0;
    const muscleColor = getMuscleColor(exercise.muscle_group);

    const isResting = restTimer !== null;
    const [remaining, setRemaining] = useState(() => (restTimer ? secondsLeft(restTimer.endsAt) : 0));
    const hasFiredRef = useRef(false);

    /**
     * The countdown is derived from `endsAt` rather than decremented, so it stays
     * accurate across backgrounding, where JS timers stop firing entirely.
     */
    useEffect(() => {
        if (!restTimer) {
            setRemaining(0);
            hasFiredRef.current = false;
            return;
        }

        hasFiredRef.current = false;
        const tick = () => {
            const left = secondsLeft(restTimer.endsAt);
            setRemaining(left);
            if (left <= 0 && !hasFiredRef.current) {
                hasFiredRef.current = true;
                Vibration.vibrate([0, 400, 150, 400]);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                stopRest();
            }
        };

        tick();
        const interval = setInterval(tick, 250);
        return () => clearInterval(interval);
    }, [restTimer, stopRest]);

    // Progress is measured against the timer's own (possibly adjusted) length —
    // using the exercise default made the bar overflow after tapping "+15s".
    const timerProgress = restTimer ? Math.min(100, (remaining / restTimer.durationSeconds) * 100) : 0;

    const handleToggleSet = (setIndex: number) => {
        const target = sets[setIndex];
        toggleSet(index, setIndex);
        // Finishing a set starts the clock; undoing one should not.
        if (target && !target.isCompleted && !target.isWarmup) startRest(index, restSeconds);
    };

    const openMenu = () => {
        Alert.alert(exercise.name, undefined, [
            ...(isFirst ? [] : [{ text: '↑ Subir', onPress: () => moveExercise(index, index - 1) }]),
            ...(isLast ? [] : [{ text: '↓ Bajar', onPress: () => moveExercise(index, index + 1) }]),
            {
                text: 'Quitar del entrenamiento',
                style: 'destructive' as const,
                onPress: () =>
                    Alert.alert('Quitar ejercicio', `¿Quitar "${exercise.name}" de este entrenamiento?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Quitar', style: 'destructive', onPress: () => removeExercise(index) },
                    ]),
            },
            { text: 'Cancelar', style: 'cancel' as const },
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.accent, { backgroundColor: muscleColor }]} />

            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                        {exercise.name}
                    </Text>
                    <View style={styles.headerMeta}>
                        <Text style={[styles.muscleGroup, { color: muscleColor }]}>{exercise.muscle_group}</Text>
                        {targetSets > 0 && targetReps ? (
                            <>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.targetText}>
                                    Meta {targetSets} × {targetReps}
                                </Text>
                            </>
                        ) : null}
                    </View>
                </View>

                <TouchableOpacity
                    onPress={openMenu}
                    style={styles.menuButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Opciones de ${exercise.name}`}
                >
                    <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: muscleColor }]} />
            </View>

            {isResting ? (
                <View style={styles.restTimerActive}>
                    <LinearGradient
                        colors={[COLORS.warning + '25', COLORS.warning + '10']}
                        style={styles.restTimerGradient}
                    >
                        <View style={styles.timerProgressBg}>
                            <View style={[styles.timerProgress, { width: `${timerProgress}%` }]} />
                        </View>

                        <View style={styles.restTimerContent}>
                            <TouchableOpacity
                                style={styles.timerAdjustBtn}
                                onPress={() => adjustRest(-15)}
                                accessibilityLabel="Restar 15 segundos"
                            >
                                <Text style={styles.timerAdjustText}>−15</Text>
                            </TouchableOpacity>

                            <View style={styles.restTimerCenter}>
                                <Text style={styles.restTimerTime}>{formatClock(remaining)}</Text>
                                <Text style={styles.restTimerLabel}>descanso</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.timerAdjustBtn}
                                onPress={() => adjustRest(15)}
                                accessibilityLabel="Sumar 15 segundos"
                            >
                                <Text style={styles.timerAdjustText}>+15</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.skipRestBtn}
                                onPress={stopRest}
                                accessibilityLabel="Saltar descanso"
                            >
                                <Ionicons name="play-skip-forward" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.restTimeIndicator}
                    onPress={() => startRest(index, restSeconds)}
                    accessibilityRole="button"
                    accessibilityLabel={`Iniciar descanso de ${formatSeconds(restSeconds)}`}
                >
                    <Ionicons name="hourglass-outline" size={14} color={COLORS.warning} />
                    <Text style={styles.restTimeText}>
                        Descanso <Text style={styles.restTimeValue}>{formatSeconds(restSeconds)}</Text>
                    </Text>
                    <View style={styles.startTimerHint}>
                        <Ionicons name="play" size={9} color={COLORS.textSecondary} />
                        <Text style={styles.startTimerHintText}>iniciar</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Coaching notes come from the routine and used to be swallowed by the
                JSON blob that lived in the same field. */}
            {notes ? (
                <View style={styles.notesContainer}>
                    <Ionicons name="information-circle-outline" size={15} color={COLORS.info} />
                    <Text style={styles.notesText}>{notes}</Text>
                </View>
            ) : null}

            {previousBest && previousBest.weight > 0 && (
                <View style={styles.previousBest}>
                    <Ionicons name="trophy-outline" size={13} color={COLORS.warning} />
                    <Text style={styles.previousBestText}>
                        Mejor marca:{' '}
                        <Text style={styles.previousBestValue}>
                            {formatWeight(previousBest.weight)}kg × {previousBest.reps}
                        </Text>
                    </Text>
                </View>
            )}

            <View style={styles.setHeaders}>
                <Text style={[styles.setHeader, { width: 34 }]}>SERIE</Text>
                <Text style={[styles.setHeader, { flex: 1 }]}>ANTERIOR</Text>
                <Text style={[styles.setHeader, { width: 62 }]}>KG</Text>
                <Text style={[styles.setHeader, { width: 62 }]}>REPS</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.setsContainer}>
                {sets.map((set, setIndex) => (
                    <SetRow
                        key={set.id}
                        set={set}
                        previousWeight={set.previousWeight ?? previousBest?.weight}
                        previousReps={set.previousReps ?? previousBest?.reps}
                        onUpdate={(data) => updateSet(index, setIndex, data)}
                        onToggle={() => handleToggleSet(setIndex)}
                        onDelete={() => removeSet(index, setIndex)}
                    />
                ))}
            </View>

            <Button
                title="Añadir Serie"
                variant="secondary"
                size="sm"
                onPress={() => addSet(index)}
                fullWidth
                icon={<Ionicons name="add" size={16} color={COLORS.textPrimary} />}
                style={styles.addSetBtn}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        overflow: 'hidden',
    },
    accent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    headerContent: {
        flex: 1,
        paddingRight: SPACING.xs,
    },
    exerciseName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    muscleGroup: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaDot: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
    },
    targetText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    menuButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: 2,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
    },
    restTimeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warning + '10',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 7,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.warning + '25',
    },
    restTimeText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    restTimeValue: {
        fontWeight: '700',
        color: COLORS.warning,
    },
    startTimerHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
    },
    startTimerHintText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    restTimerActive: {
        marginBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    restTimerGradient: {
        paddingTop: SPACING.sm + 4,
        paddingBottom: SPACING.sm,
        paddingHorizontal: SPACING.sm,
    },
    timerProgressBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: COLORS.surfaceLight,
    },
    timerProgress: {
        height: '100%',
        backgroundColor: COLORS.warning,
    },
    restTimerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.sm,
    },
    restTimerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    restTimerTime: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.warning,
        fontVariant: ['tabular-nums'],
    },
    restTimerLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: COLORS.warning + 'AA',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    timerAdjustBtn: {
        minWidth: 44,
        height: 34,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerAdjustText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    skipRestBtn: {
        width: 40,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary + '25',
        borderRadius: BORDER_RADIUS.sm,
    },
    notesContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.info + '10',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
        alignItems: 'flex-start',
    },
    notesText: {
        flex: 1,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        lineHeight: 17,
    },
    previousBest: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        gap: 5,
    },
    previousBestText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    previousBestValue: {
        fontWeight: '700',
        color: COLORS.warning,
    },
    setHeaders: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    setHeader: {
        fontSize: 9,
        color: COLORS.textMuted,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.8,
    },
    setsContainer: {
        marginBottom: SPACING.sm,
        gap: 4,
    },
    addSetBtn: {
        borderColor: COLORS.surfaceHighlight,
        backgroundColor: COLORS.surfaceLight,
    },
});
