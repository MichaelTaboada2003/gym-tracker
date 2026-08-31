import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor } from '../../constants/colors';
import { ExerciseInProgress } from '../../store/workoutStore';
import { PersonalRecord } from '../../hooks/useWorkoutSession';
import { formatMinutes, formatVolumeShort, formatWeight } from '../../lib/utils';
import { Button } from '../ui/Button';

export interface WorkoutSummaryData {
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
                        <LinearGradient
                            colors={COLORS.gradients.primary}
                            style={styles.successIcon}
                        >
                            <Ionicons name="checkmark" size={48} color="#FFF" />
                        </LinearGradient>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>¡Entrenamiento Completado!</Text>
                    <Text style={styles.routineName}>
                        {data.routineName || 'Entrenamiento Libre'}
                    </Text>

                    {/* Main Stats Grid */}
                    <View style={styles.mainStatsGrid}>
                        <LinearGradient
                            colors={[COLORS.primary + '20', COLORS.primary + '10']}
                            style={styles.mainStatCard}
                        >
                            <Ionicons name="time" size={24} color={COLORS.primary} />
                            <Text style={styles.mainStatValue}>{formatMinutes(data.duration)}</Text>
                            <Text style={styles.mainStatLabel}>Duración</Text>
                        </LinearGradient>

                        <LinearGradient
                            colors={[COLORS.success + '20', COLORS.success + '10']}
                            style={styles.mainStatCard}
                        >
                            <Ionicons name="barbell" size={24} color={COLORS.success} />
                            <Text style={styles.mainStatValue}>{formatVolumeShort(data.totalVolume)}</Text>
                            <Text style={styles.mainStatLabel}>Volumen (kg)</Text>
                        </LinearGradient>
                    </View>

                    {/* Secondary Stats */}
                    <View style={styles.secondaryStats}>
                        <View style={styles.secondaryStat}>
                            <View style={[styles.secondaryStatIcon, { backgroundColor: COLORS.info + '20' }]}>
                                <Ionicons name="fitness" size={18} color={COLORS.info} />
                            </View>
                            <View>
                                <Text style={styles.secondaryStatValue}>{data.exercises.length}</Text>
                                <Text style={styles.secondaryStatLabel}>Ejercicios</Text>
                            </View>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.secondaryStat}>
                            <View style={[styles.secondaryStatIcon, { backgroundColor: COLORS.warning + '20' }]}>
                                <Ionicons name="layers" size={18} color={COLORS.warning} />
                            </View>
                            <View>
                                <Text style={styles.secondaryStatValue}>{data.totalSets}</Text>
                                <Text style={styles.secondaryStatLabel}>Series</Text>
                            </View>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.secondaryStat}>
                            <View style={[styles.secondaryStatIcon, { backgroundColor: COLORS.secondary + '20' }]}>
                                <Ionicons name="repeat" size={18} color={COLORS.secondary} />
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
                        icon={<Ionicons name="checkmark-circle" size={20} color="#FFF" />}
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
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    routineName: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
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
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    mainStatValue: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
    },
    mainStatLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    // Secondary Stats
    secondaryStats: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    secondaryStat: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    secondaryStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryStatValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    secondaryStatLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
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
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        gap: 6,
    },
    muscleGroupDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    muscleGroupText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
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
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    // Personal Records
    prCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warning + '10',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
    },
    prIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.warning + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    prContent: {
        flex: 1,
    },
    prExercise: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    prValue: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
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
        fontWeight: '600',
        color: COLORS.success,
    },
    // Exercise List
    exerciseList: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    exerciseColorBar: {
        width: 4,
        height: 36,
        borderRadius: 2,
        marginRight: SPACING.md,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseRowName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    exerciseRowDetails: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    exerciseVolume: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    // Action
    actionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
    },
});
