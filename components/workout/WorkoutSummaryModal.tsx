import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { ExerciseInProgress } from '../../store/workoutStore';
import { PersonalRecord } from '../../hooks/useWorkoutSession';
import { formatMinutes, formatVolumeShort, formatWeight } from '../../lib/utils';
import { Button } from '../ui/Button';
import { AnalysisPanel } from './AnalysisPanel';

export interface WorkoutSummaryData {
    /** The saved session, so the analysis can be attached to it. */
    sessionId: string;
    routineName: string | null;
    /** Minutes. */
    duration: number;
    exercises: ExerciseInProgress[];
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    personalRecords: PersonalRecord[];
}

interface WorkoutSummaryModalProps {
    visible: boolean;
    data: WorkoutSummaryData | null;
    onClose: () => void;
}

export function WorkoutSummaryModal({ visible, data, onClose }: WorkoutSummaryModalProps) {
    const insets = useSafeAreaInsets();
    if (!data) return null;

    // Calculate muscle groups worked
    const muscleGroups = Array.from(
        new Set(data.exercises.map(ex => ex.exercise.muscle_group).filter(Boolean))
    );

    // Get exercise summaries
    const exerciseSummaries = data.exercises.map(ex => {
        const completedSets = ex.sets.filter(s => s.isCompleted && !s.isWarmup);
        const maxWeight = Math.max(...completedSets.map(s => s.weight), 0);
        const totalReps = completedSets.reduce((sum, s) => sum + s.reps, 0);
        const volume = completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

        return {
            name: ex.exercise.name,
            muscleGroup: ex.exercise.muscle_group,
            sets: completedSets.length,
            maxWeight,
            totalReps,
            volume,
        };
    }).filter(ex => ex.sets > 0);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Success Icon */}
                    <View style={styles.successIconContainer}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark" size={44} color={COLORS.onChalk} />
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>¡Entrenamiento completado!</Text>
                    <Text style={styles.routineName}>
                        {data.routineName || 'Entrenamiento Libre'}
                    </Text>

                    {/* Main Stats Grid */}
                    <View style={styles.mainStatsGrid}>
                        <View style={styles.mainStatCard}>
                            <Ionicons name="time" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.mainStatValue}>{formatMinutes(data.duration)}</Text>
                            <Text style={styles.mainStatLabel}>Duración</Text>
                        </View>

                        <View style={styles.mainStatCard}>
                            <Ionicons name="barbell" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.mainStatValue}>{formatVolumeShort(data.totalVolume)}</Text>
                            <Text style={styles.mainStatLabel}>Volumen kg</Text>
                        </View>
                    </View>

                    {/* Secondary Stats */}
                    <View style={styles.secondaryStats}>
                        <View style={styles.secondaryStat}>
                            <View style={[styles.secondaryStatIcon, { backgroundColor: COLORS.surfaceLight }]}>
                                <Ionicons name="barbell" size={17} color={COLORS.textSecondary} />
                            </View>
                            <View>
                                <Text style={styles.secondaryStatValue}>{data.exercises.length}</Text>
                                <Text style={styles.secondaryStatLabel}>Ejercicios</Text>
                            </View>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.secondaryStat}>
                            <View style={[styles.secondaryStatIcon, { backgroundColor: COLORS.surfaceLight }]}>
                                <Ionicons name="layers" size={17} color={COLORS.textSecondary} />
                            </View>
                            <View>
                                <Text style={styles.secondaryStatValue}>{data.totalSets}</Text>
                                <Text style={styles.secondaryStatLabel}>Series</Text>
                            </View>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.secondaryStat}>
                            <View style={[styles.secondaryStatIcon, { backgroundColor: COLORS.surfaceLight }]}>
                                <Ionicons name="repeat" size={17} color={COLORS.textSecondary} />
                            </View>
                            <View>
                                <Text style={styles.secondaryStatValue}>{data.totalReps}</Text>
                                <Text style={styles.secondaryStatLabel}>Reps</Text>
                            </View>
                        </View>
                    </View>

                    {/* Muscle Groups Worked */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Músculos Trabajados</Text>
                        <View style={styles.muscleGroupsRow}>
                            {muscleGroups.map(group => (
                                <View
                                    key={group}
                                    style={[
                                        styles.muscleGroupPill,
                                        { backgroundColor: getMuscleColor(group) + '20' }
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.muscleGroupDot,
                                            { backgroundColor: getMuscleColor(group) }
                                        ]}
                                    />
                                    <Text style={[
                                        styles.muscleGroupText,
                                        { color: getMuscleColor(group) }
                                    ]}>
                                        {group}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Personal Records (if any) */}
                    {data.personalRecords.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Ionicons name="trophy" size={20} color={COLORS.warning} />
                                <Text style={styles.sectionTitle}>Récords Personales</Text>
                            </View>
                            {data.personalRecords.map((pr) => (
                                <View key={pr.exerciseId} style={styles.prCard}>
                                    <View style={styles.prIcon}>
                                        <Ionicons name="medal" size={20} color={COLORS.warning} />
                                    </View>
                                    <View style={styles.prContent}>
                                        <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                                        <Text style={styles.prValue}>
                                            {formatWeight(pr.weight)}kg × {pr.reps} reps ·{' '}
                                            {Math.round(pr.estimated1RM)}kg 1RM
                                        </Text>
                                    </View>
                                    <View style={styles.prImprovement}>
                                        <Ionicons name="arrow-up" size={12} color={COLORS.success} />
                                        <Text style={styles.prImprovementText}>{pr.improvement}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.section}>
                        <AnalysisPanel sessionId={data.sessionId} />
                    </View>

                    {/* Exercise Breakdown */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Detalle por Ejercicio</Text>
                        <View style={styles.exerciseList}>
                            {exerciseSummaries.map((ex, index) => (
                                <View key={index} style={styles.exerciseRow}>
                                    <View style={[
                                        styles.exerciseColorBar,
                                        { backgroundColor: getMuscleColor(ex.muscleGroup) }
                                    ]} />
                                    <View style={styles.exerciseInfo}>
                                        <Text style={styles.exerciseRowName}>{ex.name}</Text>
                                        <Text style={styles.exerciseRowDetails}>
                                            {ex.sets} series · {ex.totalReps} reps · {formatWeight(ex.maxWeight)}kg máx
                                        </Text>
                                    </View>
                                    <Text style={styles.exerciseVolume}>
                                        {formatVolumeShort(ex.volume)} kg
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>

                {/* Action Button */}
                <View style={[styles.actionContainer, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
                    <Button
                        title="Listo"
                        onPress={onClose}
                        variant="gradient"
                        size="lg"
                        fullWidth
                        icon={<Ionicons name="checkmark-circle" size={20} color={COLORS.onChalk} />}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.lg,
        paddingBottom: 140,
    },
    successIconContainer: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: FONTS.display,
        fontSize: 34,
        lineHeight: 36,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    routineName: {
        fontFamily: FONTS.medium,
        fontSize: 11,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    // Main Stats
    mainStatsGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    mainStatCard: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
    },
    mainStatValue: {
        fontFamily: FONTS.display,
        fontSize: 34,
        lineHeight: 36,
        color: COLORS.textPrimary,
        marginTop: SPACING.xs,
        fontVariant: ['tabular-nums'],
    },
    mainStatLabel: {
        fontFamily: FONTS.medium,
        fontSize: 9,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
    },
    // Secondary Stats
    secondaryStats: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.xl,
    },
    secondaryStat: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    secondaryStatIcon: {
        width: 32,
        height: 32,
        borderRadius: BORDER_RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryStatValue: {
        fontFamily: FONTS.display,
        fontSize: 20,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    secondaryStatLabel: {
        fontFamily: FONTS.regular,
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.surfaceHighlight,
        marginHorizontal: SPACING.xs,
    },
    // Muscle Groups
    muscleGroupsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    muscleGroupPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.sm,
        gap: 6,
    },
    muscleGroupDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    muscleGroupText: {
        fontFamily: FONTS.semibold,
        fontSize: 11,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    // Sections
    section: {
        marginBottom: SPACING.xl,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontFamily: FONTS.medium,
        fontSize: 10,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        marginBottom: SPACING.md,
    },
    // Personal Records
    prCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.warning,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },
    prIcon: {
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.warning + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    prContent: {
        flex: 1,
    },
    prExercise: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    prValue: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    prImprovement: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success + '20',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        gap: 2,
    },
    prImprovementText: {
        fontSize: 12,
        fontFamily: FONTS.semibold,
        color: COLORS.success,
    },
    // Exercise List
    exerciseList: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    exerciseColorBar: {
        width: 3,
        height: 32,
        marginRight: SPACING.md,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseRowName: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    exerciseRowDetails: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    exerciseVolume: {
        fontFamily: FONTS.display,
        fontSize: 16,
        color: COLORS.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    // Action
    actionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        backgroundColor: COLORS.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.surfaceHighlight,
    },
});
