import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { CreateRoutineModal } from '../../components/routines/CreateRoutineModal';
import { useRoutines, RoutineWithExercises } from '../../hooks/useRoutines';
import { GradientText } from '../../components/ui/GradientText';
import { usePlans } from '../../hooks/usePlans';
import { PlanCard } from '../../components/plans/PlanCard';
import { CreatePlanModal } from '../../components/plans/CreatePlanModal';

// Muscle group colors
const MUSCLE_COLORS: Record<string, string> = {
    'Pecho': '#EF4444',
    'Espalda': '#3B82F6',
    'Hombros': '#F59E0B',
    'Bíceps': '#8B5CF6',
    'Tríceps': '#A855F7',
    'Piernas': '#10B981',
    'Core': '#EC4899',
    'Cardio': '#06B6D4',
};

// Get unique muscle groups from a routine
const getMuscleGroups = (routine: RoutineWithExercises): string[] => {
    const groups = new Set(
        routine.routine_exercises?.map(re => re.exercise?.muscle_group).filter(Boolean) || []
    );
    return Array.from(groups);
};

// Get total sets from routine
const getTotalSets = (routine: RoutineWithExercises): number => {
    return routine.routine_exercises?.reduce((sum, re) => sum + (re.target_sets || 0), 0) || 0;
};

export default function RoutinesScreen() {
    const router = useRouter();
    const { routines, loading, fetchRoutines, createRoutine, updateRoutine, deleteRoutine } = useRoutines();
    const { plans, loading: plansLoading, fetchPlans, createPlan } = usePlans();
    const [isRoutineModalVisible, setIsRoutineModalVisible] = useState(false);
    const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
    const [editingRoutine, setEditingRoutine] = useState<any>(null);

    const handleEditRoutine = (routine: any) => {
        setEditingRoutine(routine);
        setIsRoutineModalVisible(true);
    };

    const handleCloseRoutineModal = () => {
        setIsRoutineModalVisible(false);
        setEditingRoutine(null);
    };

    const handleDeleteRoutine = async (routine: any) => {
        Alert.alert(
            'Eliminar Rutina',
            `¿Estás seguro de que quieres eliminar "${routine.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deleteRoutine(routine.id)
                },
            ]
        );
    };



    const renderRoutineCard = (routine: RoutineWithExercises) => {
        const muscleGroups = getMuscleGroups(routine);
        const totalSets = getTotalSets(routine);
        const exerciseCount = routine.routine_exercises?.length || 0;

        // Get gradient colors based on first muscle group
        const primaryMuscle = muscleGroups[0];
        const primaryColor = MUSCLE_COLORS[primaryMuscle] || COLORS.primary;

        return (
            <TouchableOpacity
                key={routine.id}
                style={styles.routineCard}
                onPress={() => router.push(`/routine/${routine.id}`)}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[primaryColor + '20', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.routineGradient}
                >
                    {/* Left accent bar */}
                    <View style={[styles.accentBar, { backgroundColor: primaryColor }]} />

                    <View style={styles.routineContent}>
                        {/* Header */}
                        <View style={styles.routineHeader}>
                            <View style={styles.routineInfo}>
                                <Text style={styles.routineName}>{routine.name}</Text>
                                {routine.description && (
                                    <Text style={styles.routineDescription} numberOfLines={1}>
                                        {routine.description}
                                    </Text>
                                )}
                            </View>

                            {/* Action buttons */}
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleEditRoutine(routine);
                                    }}
                                >
                                    <Ionicons name="pencil" size={16} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRoutine(routine);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Muscle group pills */}
                        {muscleGroups.length > 0 && (
                            <View style={styles.muscleGroupsRow}>
                                {muscleGroups.slice(0, 4).map((group) => (
                                    <View
                                        key={group}
                                        style={[
                                            styles.muscleGroupPill,
                                            { backgroundColor: (MUSCLE_COLORS[group] || COLORS.primary) + '20' }
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.muscleGroupDot,
                                                { backgroundColor: MUSCLE_COLORS[group] || COLORS.primary }
                                            ]}
                                        />
                                        <Text
                                            style={[
                                                styles.muscleGroupText,
                                                { color: MUSCLE_COLORS[group] || COLORS.primary }
                                            ]}
                                        >
                                            {group}
                                        </Text>
                                    </View>
                                ))}
                                {muscleGroups.length > 4 && (
                                    <Text style={styles.moreGroups}>+{muscleGroups.length - 4}</Text>
                                )}
                            </View>
                        )}

                        {/* Stats row */}
                        <View style={styles.statsRow}>
                            {/* Duration with color indicator */}
                            <View style={[styles.statItem, { borderLeftColor: routine.durationColor || COLORS.primary }]}>
                                <Ionicons name="time" size={16} color={routine.durationColor || COLORS.primary} />
                                <Text style={[styles.statValue, { color: routine.durationColor || COLORS.textPrimary }]}>
                                    {routine.calculatedDuration || routine.estimated_duration}
                                </Text>
                                <Text style={styles.statLabel}>min</Text>
                            </View>

                            {/* Exercises */}
                            <View style={styles.statItem}>
                                <Ionicons name="barbell" size={16} color={COLORS.info} />
                                <Text style={styles.statValue}>{exerciseCount}</Text>
                                <Text style={styles.statLabel}>ejercicios</Text>
                            </View>

                            {/* Sets */}
                            <View style={styles.statItem}>
                                <Ionicons name="layers" size={16} color={COLORS.success} />
                                <Text style={styles.statValue}>{totalSets}</Text>
                                <Text style={styles.statLabel}>series</Text>
                            </View>

                            {/* Duration label badge */}
                            {routine.durationLabel && (
                                <View style={[styles.durationBadge, { backgroundColor: routine.durationColor + '20' }]}>
                                    <Text style={[styles.durationBadgeText, { color: routine.durationColor }]}>
                                        {routine.durationLabel}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Exercise preview */}
                        {exerciseCount > 0 && (
                            <View style={styles.exercisePreview}>
                                <Text style={styles.exercisePreviewTitle}>
                                    <Ionicons name="list" size={12} color={COLORS.textMuted} /> Vista previa:
                                </Text>
                                <Text style={styles.exercisePreviewList} numberOfLines={1}>
                                    {routine.routine_exercises
                                        ?.slice(0, 3)
                                        .map(re => re.exercise?.name)
                                        .filter(Boolean)
                                        .join(' • ')}
                                    {exerciseCount > 3 && ` (+${exerciseCount - 3} más)`}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Chevron */}
                    <View style={styles.chevronContainer}>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={[COLORS.primary + '15', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerSubtitle}>ORGANIZA TUS</Text>
                        <Text style={styles.headerTitle}>Rutinas</Text>
                    </View>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.headerBtnSecondary}
                            onPress={() => setIsPlanModalVisible(true)}
                        >
                            <LinearGradient
                                colors={COLORS.gradients.secondary}
                                style={styles.headerBtnGradient}
                            >
                                <Ionicons name="calendar" size={18} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerBtnPrimary}
                            onPress={() => setIsRoutineModalVisible(true)}
                        >
                            <LinearGradient
                                colors={COLORS.gradients.primary}
                                style={styles.headerBtnGradient}
                            >
                                <Ionicons name="add" size={22} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={loading || plansLoading}
                        onRefresh={() => { fetchRoutines(); fetchPlans(); }}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {/* Plans Section */}
                {plans.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="calendar" size={18} color={COLORS.secondary} />
                                <Text style={styles.sectionTitle}>Mis Programas</Text>
                            </View>
                            <Text style={styles.sectionCount}>{plans.length}</Text>
                        </View>
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                onPress={() => router.push(`/plan/${plan.id}`)}
                            />
                        ))}
                    </View>
                )}

                {/* Routines Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="barbell" size={18} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Rutinas Individuales</Text>
                        </View>
                        <Text style={styles.sectionCount}>{routines.length}</Text>
                    </View>

                    {routines.length === 0 && !loading ? (
                        <View style={styles.emptyState}>
                            <LinearGradient
                                colors={[COLORS.surfaceLight, COLORS.surface]}
                                style={styles.emptyStateCard}
                            >
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="barbell-outline" size={48} color={COLORS.primary} />
                                </View>
                                <Text style={styles.emptyTitle}>No tienes rutinas</Text>
                                <Text style={styles.emptySubtitle}>
                                    Crea tu primera rutina para organizar tus ejercicios y entrenar de forma estructurada
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyButton}
                                    onPress={() => setIsRoutineModalVisible(true)}
                                >
                                    <LinearGradient
                                        colors={COLORS.gradients.primary}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.emptyButtonGradient}
                                    >
                                        <Ionicons name="add" size={20} color="#FFF" />
                                        <Text style={styles.emptyButtonText}>Crear Rutina</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    ) : (
                        <View style={styles.routinesList}>
                            {routines.map(renderRoutineCard)}
                        </View>
                    )}
                </View>
            </ScrollView>

            <CreateRoutineModal
                visible={isRoutineModalVisible}
                onClose={handleCloseRoutineModal}
                onCreate={createRoutine}
                onUpdate={updateRoutine}
                initialData={editingRoutine}
            />
            <CreatePlanModal
                visible={isPlanModalVisible}
                onClose={() => setIsPlanModalVisible(false)}
                onCreate={createPlan}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Header
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 3,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    headerTitle: {
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    headerBtnPrimary: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    headerBtnSecondary: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    headerBtnGradient: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Content
    content: {
        padding: SPACING.md,
        paddingBottom: 120,
    },
    // Sections
    section: {
        marginBottom: SPACING.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.xs,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    sectionCount: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
    },
    // Routine Card
    routinesList: {
        gap: SPACING.md,
    },
    routineCard: {
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    routineGradient: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    accentBar: {
        width: 4,
    },
    routineContent: {
        flex: 1,
        padding: SPACING.md,
    },
    routineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    routineInfo: {
        flex: 1,
    },
    routineName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    routineDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Muscle groups
    muscleGroupsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    muscleGroupPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
        gap: 4,
    },
    muscleGroupDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    muscleGroupText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    moreGroups: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '500',
        marginLeft: 4,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: SPACING.xs,
        borderLeftWidth: 2,
        borderLeftColor: 'transparent',
    },
    statValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    durationBadge: {
        marginLeft: 'auto',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
    },
    durationBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    // Exercise preview
    exercisePreview: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        marginTop: SPACING.xs,
    },
    exercisePreviewTitle: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '500',
        marginBottom: 2,
    },
    exercisePreviewList: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    chevronContainer: {
        justifyContent: 'center',
        paddingRight: SPACING.md,
    },
    // Empty state
    emptyState: {
        alignItems: 'center',
    },
    emptyStateCard: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    emptyTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.lg,
    },
    emptyButton: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    emptyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        gap: SPACING.xs,
    },
    emptyButtonText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: '#FFF',
    },
});
