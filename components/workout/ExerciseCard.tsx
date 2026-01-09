import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    onUpdateSet: (setIndex: number, data: Partial<SetData>) => void;
    onCompleteSet: (setIndex: number) => void;
    onAddSet: () => void;
    onRemoveSet: (setIndex: number) => void;
    onRemoveExercise: () => void;
}

export function ExerciseCard({
    exercise,
    sets,
    previousBest,
    onUpdateSet,
    onCompleteSet,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
}: ExerciseCardProps) {
    const completedSets = sets.filter((s) => s.isCompleted && !s.isWarmup).length;
    const totalWorkSets = sets.filter((s) => !s.isWarmup).length;

    // Calculate progress percentage
    const progress = totalWorkSets > 0 ? (completedSets / totalWorkSets) * 100 : 0;

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
                        previousWeight={previousBest?.weight}
                        previousReps={previousBest?.reps}
                        onUpdate={(data) => onUpdateSet(index, data)}
                        onComplete={() => onCompleteSet(index)}
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
        marginBottom: SPACING.md,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.success,
    },
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
