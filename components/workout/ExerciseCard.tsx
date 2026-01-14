import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { Exercise } from '../../lib/database.types';
import { SetData } from '../../store/workoutStore';
import { SetRow } from './SetRow';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

interface ExerciseCardProps {
    exercise: Exercise;
    sets: SetData[];
    previousBest: { weight: number; reps: number } | null;
    restSeconds?: number;
    onUpdateSet: (setIndex: number, data: Partial<SetData>) => void;
    onCompleteSet: (setIndex: number) => void;
    onAddSet: () => void;
    onRemoveSet: (setIndex: number) => void;
    onRemoveExercise: () => void;
}

// Format seconds to mm:ss
const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Format rest time for display
const formatRestDisplay = (seconds: number): string => {
    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
    }
    return `${seconds}s`;
};

export function ExerciseCard({
    exercise,
    sets,
    previousBest,
    restSeconds = 90,
    onUpdateSet,
    onCompleteSet,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
}: ExerciseCardProps) {
    const completedSets = sets.filter((s) => s.isCompleted && !s.isWarmup).length;
    const totalWorkSets = sets.filter((s) => !s.isWarmup).length;

    // Rest timer state
    const [isResting, setIsResting] = useState(false);
    const [restTimeLeft, setRestTimeLeft] = useState(restSeconds);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate progress percentage
    const progress = totalWorkSets > 0 ? (completedSets / totalWorkSets) * 100 : 0;

    // Start rest timer
    const startRestTimer = () => {
        setIsResting(true);
        setRestTimeLeft(restSeconds);
    };

    // Stop rest timer
    const stopRestTimer = () => {
        setIsResting(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    // Add/subtract time
    const adjustRestTime = (delta: number) => {
        setRestTimeLeft(prev => Math.max(0, prev + delta));
    };

    // Handle rest timer countdown
    useEffect(() => {
        if (isResting && restTimeLeft > 0) {
            timerRef.current = setInterval(() => {
                setRestTimeLeft(prev => {
                    if (prev <= 1) {
                        // Timer finished
                        Vibration.vibrate([0, 500, 200, 500]); // Vibrate pattern
                        setIsResting(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isResting]);

    // Calculate timer progress
    const timerProgress = restSeconds > 0 ? (restTimeLeft / restSeconds) * 100 : 0;

    // Handle set completion - start rest timer
    const handleCompleteSet = (setIndex: number) => {
        onCompleteSet(setIndex);
        // Auto-start rest timer after completing a set
        if (!isResting) {
            startRestTimer();
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.muscleGroup}>{exercise.muscle_group}</Text>
                </View>
                <IconButton
                    icon={<Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />}
                    variant="ghost"
                    size={32}
                    onPress={onRemoveExercise}
                />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>

            {/* Rest Time Indicator / Timer */}
            {isResting ? (
                <View style={styles.restTimerActive}>
                    <LinearGradient
                        colors={[COLORS.warning + '20', COLORS.warning + '10']}
                        style={styles.restTimerGradient}
                    >
                        {/* Timer progress bar */}
                        <View style={styles.timerProgressBg}>
                            <View style={[styles.timerProgress, { width: `${timerProgress}%` }]} />
                        </View>

                        <View style={styles.restTimerContent}>
                            <View style={styles.restTimerLeft}>
                                <Ionicons name="hourglass" size={18} color={COLORS.warning} />
                                <Text style={styles.restTimerLabel}>Descanso</Text>
                            </View>

                            <View style={styles.restTimerCenter}>
                                <TouchableOpacity
                                    style={styles.timerAdjustBtn}
                                    onPress={() => adjustRestTime(-15)}
                                >
                                    <Ionicons name="remove" size={16} color={COLORS.textSecondary} />
                                </TouchableOpacity>

                                <Text style={styles.restTimerTime}>{formatTime(restTimeLeft)}</Text>

                                <TouchableOpacity
                                    style={styles.timerAdjustBtn}
                                    onPress={() => adjustRestTime(15)}
                                >
                                    <Ionicons name="add" size={16} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.skipRestBtn}
                                onPress={stopRestTimer}
                            >
                                <Ionicons name="play-skip-forward" size={16} color={COLORS.primary} />
                                <Text style={styles.skipRestText}>Saltar</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.restTimeIndicator}
                    onPress={startRestTimer}
                >
                    <Ionicons name="hourglass-outline" size={14} color={COLORS.warning} />
                    <Text style={styles.restTimeText}>
                        Descanso: <Text style={styles.restTimeValue}>{formatRestDisplay(restSeconds)}</Text>
                    </Text>
                    <View style={styles.startTimerHint}>
                        <Ionicons name="play" size={10} color={COLORS.textMuted} />
                        <Text style={styles.startTimerHintText}>iniciar</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Target & Notes Info */}
            {(exercise as any).notes && (
                <View style={styles.notesContainer}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.notesText}>{(exercise as any).notes}</Text>
                </View>
            )}

            <View style={styles.targetsContainer}>
                {(exercise as any).targetSets && (exercise as any).targetReps && (
                    <Text style={styles.targetText}>
                        <Text style={{ fontWeight: '700' }}>Meta:</Text> {(exercise as any).targetSets} series × {(exercise as any).targetReps} reps
                    </Text>
                )}
            </View>

            {/* Previous best indicator */}
            {previousBest && (
                <View style={styles.previousBest}>
                    <Ionicons name="trophy-outline" size={14} color={COLORS.warning} />
                    <Text style={styles.previousBestText}>
                        Mejor: <Text style={styles.previousBestValue}>{previousBest.weight}kg × {previousBest.reps}</Text>
                    </Text>
                </View>
            )}

            {/* Column Headers */}
            <View style={styles.setHeaders}>
                <Text style={[styles.setHeader, { width: 30 }]}>SET</Text>
                <Text style={[styles.setHeader, { flex: 1 }]}>ANTERIOR</Text>
                <Text style={[styles.setHeader, { width: 60 }]}>KG</Text>
                <Text style={[styles.setHeader, { width: 60 }]}>REPS</Text>
                <View style={{ width: 32 }} />
            </View>
            {/* Sets */}
            <View style={styles.setsContainer}>
                {sets.map((set, index) => (
                    <SetRow
                        key={set.id}
                        set={set}
                        previousWeight={set.previousWeight ?? previousBest?.weight}
                        previousReps={set.previousReps ?? previousBest?.reps}
                        onUpdate={(data) => onUpdateSet(index, data)}
                        onComplete={() => handleCompleteSet(index)}
                        onDelete={() => onRemoveSet(index)}
                    />
                ))}
            </View>

            {/* Add set button */}
            <Button
                title="Añadir Serie"
                variant="secondary"
                size="sm"
                onPress={onAddSet}
                fullWidth
                style={styles.addSetBtn}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    headerContent: {
        flex: 1,
    },
    exerciseName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    muscleGroup: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
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
        backgroundColor: COLORS.success,
    },
    // Rest Time Indicator (inactive)
    restTimeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warning + '10',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.warning + '20',
    },
    restTimeText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    restTimeValue: {
        fontWeight: '600',
        color: COLORS.warning,
    },
    startTimerHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
    },
    startTimerHintText: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
    // Rest Timer Active
    restTimerActive: {
        marginBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    restTimerGradient: {
        padding: SPACING.sm,
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
    },
    restTimerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    restTimerLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.warning,
    },
    restTimerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    timerAdjustBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    restTimerTime: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.warning,
        minWidth: 70,
        textAlign: 'center',
    },
    skipRestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.sm,
    },
    skipRestText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    // Notes
    notesContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLight,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
        alignItems: 'flex-start',
    },
    notesText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        fontStyle: 'italic',
    },
    targetsContainer: {
        marginBottom: SPACING.xs,
    },
    targetText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    previousBest: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: 6,
    },
    previousBestText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    previousBestValue: {
        fontWeight: '600',
        color: COLORS.warning,
    },
    setHeaders: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
        paddingHorizontal: SPACING.xs,
    },
    setHeader: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '600',
        textAlign: 'center',
    },
    setsContainer: {
        marginBottom: SPACING.md,
        gap: 8,
    },
    addSetBtn: {
        borderColor: COLORS.surfaceHighlight,
        backgroundColor: COLORS.surfaceLight,
    },
});
