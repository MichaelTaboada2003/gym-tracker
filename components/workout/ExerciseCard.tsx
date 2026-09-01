import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Alert, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, getMuscleColor } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { ExerciseInProgress, RestTimerState, useWorkoutStore } from '../../store/workoutStore';
import { SetRow } from './SetRow';
import { SetMarks } from '../ui/SetMarks';
import { formatClock, formatSeconds, formatWeight } from '../../lib/utils';
import { notifySuccess } from '../../lib/feedback';

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
 * One exercise, laid out as a page of a training log: a plate-coloured rail
 * down the edge, the set tally under the title, then the ruled ledger of sets.
 *
 * Memoised — the screen re-renders on every keystroke, and store updates replace
 * only the exercise that actually changed, so untouched cards keep their
 * identity and skip rendering entirely. Actions are read straight from the
 * store, whose references are stable, unlike inline `onX` props.
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
                notifySuccess();
                stopRest();
            }
        };

        tick();
        const interval = setInterval(tick, 250);
        return () => clearInterval(interval);
    }, [restTimer, stopRest]);

    // Measured against the timer's own (possibly adjusted) length — using the
    // exercise default made the bar overflow after tapping "+15s".
    const timerProgress = restTimer ? Math.min(1, remaining / restTimer.durationSeconds) : 0;

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
            <View style={[styles.rail, { backgroundColor: muscleColor }]} />

            <View style={styles.body}>
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.exerciseName} numberOfLines={2}>
                            {exercise.name}
                        </Text>
                        <View style={styles.headerMeta}>
                            <Text style={[styles.muscleGroup, { color: muscleColor }]}>
                                {exercise.muscle_group}
                            </Text>
                            {targetSets > 0 && targetReps ? (
                                <Text style={styles.targetText}>
                                    Meta {targetSets}×{targetReps}
                                </Text>
                            ) : null}
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={openMenu}
                        style={styles.menuButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Opciones de ${exercise.name}`}
                    >
                        <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Tally and rest share one line: how far in you are, and how
                    long until the next set, is the whole between-sets question. */}
                <View style={styles.tallyRow}>
                    <SetMarks
                        total={workSets.length}
                        completed={completedSets}
                        color={muscleColor}
                        accessibilityLabel={`${completedSets} de ${workSets.length} series de ${exercise.name}`}
                    />

                    {isResting ? (
                        <View style={styles.restLive}>
                            <Pressable
                                onPress={() => adjustRest(-15)}
                                style={styles.restStep}
                                accessibilityLabel="Restar 15 segundos"
                            >
                                <Text style={styles.restStepText}>−15</Text>
                            </Pressable>

                            <Text style={styles.restClock}>{formatClock(remaining)}</Text>

                            <Pressable
                                onPress={() => adjustRest(15)}
                                style={styles.restStep}
                                accessibilityLabel="Sumar 15 segundos"
                            >
                                <Text style={styles.restStepText}>+15</Text>
                            </Pressable>

                            <Pressable
                                onPress={stopRest}
                                style={styles.restSkip}
                                accessibilityLabel="Saltar descanso"
                            >
                                <Ionicons name="play-skip-forward" size={13} color={COLORS.onChalk} />
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable
                            onPress={() => startRest(index, restSeconds)}
                            style={styles.restIdle}
                            accessibilityRole="button"
                            accessibilityLabel={`Iniciar descanso de ${formatSeconds(restSeconds)}`}
                        >
                            <Ionicons name="timer-outline" size={13} color={COLORS.textSecondary} />
                            <Text style={styles.restIdleText}>{formatSeconds(restSeconds)}</Text>
                        </Pressable>
                    )}
                </View>

                {/* A hairline that drains as the rest runs out: readable at arm's
                    length, and absent entirely when you are not resting. */}
                {isResting && (
                    <View style={styles.restTrack}>
                        <View style={[styles.restTrackFill, { width: `${timerProgress * 100}%` }]} />
                    </View>
                )}

                {notes ? <Text style={styles.notesText}>{notes}</Text> : null}

                {previousBest && previousBest.weight > 0 && (
                    <Text style={styles.previousBestText}>
                        Mejor marca{' '}
                        <Text style={styles.previousBestValue}>
                            {formatWeight(previousBest.weight)} × {previousBest.reps}
                        </Text>
                    </Text>
                )}

                <View style={styles.ledger}>
                    <View style={styles.setHeaders}>
                        <Text style={[styles.setHeader, styles.colSet]}>Serie</Text>
                        <Text style={[styles.setHeader, styles.colPrev]}>Anterior</Text>
                        <Text style={[styles.setHeader, styles.colInput]}>kg</Text>
                        <Text style={[styles.setHeader, styles.colInput]}>reps</Text>
                        <View style={styles.colCheck} />
                    </View>

                    {sets.map((set, setIndex) => (
                        <SetRow
                            key={set.id}
                            set={set}
                            accentColor={muscleColor}
                            previousWeight={set.previousWeight ?? previousBest?.weight}
                            previousReps={set.previousReps ?? previousBest?.reps}
                            onUpdate={(data) => updateSet(index, setIndex, data)}
                            onToggle={() => handleToggleSet(setIndex)}
                            onDelete={() => removeSet(index, setIndex)}
                        />
                    ))}
                </View>

                <Pressable
                    onPress={() => addSet(index)}
                    style={({ pressed }) => [styles.addSetBtn, pressed && styles.addSetPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Añadir serie a ${exercise.name}`}
                >
                    <Ionicons name="add" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.addSetText}>Añadir serie</Text>
                </Pressable>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        overflow: 'hidden',
    },
    /** The plate-colour rail: the only colour on the card. */
    rail: {
        width: 3,
    },
    body: {
        flex: 1,
        padding: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    headerContent: {
        flex: 1,
        paddingRight: SPACING.xs,
    },
    exerciseName: {
        fontFamily: FONTS.display,
        fontSize: 22,
        lineHeight: 24,
        color: COLORS.textPrimary,
    },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: 3,
    },
    muscleGroup: {
        fontFamily: FONTS.semibold,
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    targetText: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
    },
    menuButton: {
        width: 32,
        height: 32,
        marginTop: -4,
        marginRight: -6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tallyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.sm + 2,
        minHeight: 30,
    },
    restIdle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
    },
    restIdleText: {
        fontFamily: FONTS.medium,
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    restLive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    restStep: {
        paddingHorizontal: 7,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
    },
    restStepText: {
        fontFamily: FONTS.semibold,
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    restClock: {
        fontFamily: FONTS.display,
        fontSize: 26,
        lineHeight: 28,
        minWidth: 62,
        textAlign: 'center',
        color: COLORS.warning,
        fontVariant: ['tabular-nums'],
    },
    restSkip: {
        width: 28,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.warning,
    },
    restTrack: {
        height: 2,
        marginTop: SPACING.sm,
        backgroundColor: COLORS.surfaceHighlight,
        borderRadius: 1,
        overflow: 'hidden',
    },
    restTrackFill: {
        height: '100%',
        backgroundColor: COLORS.warning,
    },
    notesText: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        lineHeight: 17,
        color: COLORS.textSecondary,
        marginTop: SPACING.sm + 2,
        paddingLeft: SPACING.sm,
        borderLeftWidth: 2,
        borderLeftColor: COLORS.surfaceHighlight,
    },
    previousBestText: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: SPACING.sm,
    },
    previousBestValue: {
        fontFamily: FONTS.semibold,
        color: COLORS.textSecondary,
    },
    /** Ruled block: hairlines, not gaps, so the sets read as one table. */
    ledger: {
        marginTop: SPACING.sm + 2,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.surfaceHighlight,
    },
    setHeaders: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: SPACING.sm,
        paddingBottom: 2,
    },
    setHeader: {
        fontFamily: FONTS.medium,
        fontSize: 9,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    // Shared column widths keep the header and every row on one grid.
    colSet: { width: 30 },
    colPrev: { flex: 1 },
    colInput: { width: 62 },
    colCheck: { width: 44 },
    addSetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: SPACING.sm,
        paddingVertical: 9,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.surfaceHighlight,
    },
    addSetPressed: {
        backgroundColor: COLORS.surfaceLight,
    },
    addSetText: {
        fontFamily: FONTS.medium,
        fontSize: 12,
        color: COLORS.textSecondary,
    },
});
