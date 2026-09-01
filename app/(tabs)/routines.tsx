import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { CreateRoutineModal } from '../../components/routines/CreateRoutineModal';
import { CreatePlanModal } from '../../components/plans/CreatePlanModal';
import { PlanCard } from '../../components/plans/PlanCard';
import { useRoutines, RoutineWithExercises } from '../../hooks/useRoutines';
import { usePlans, PlanWithRoutines } from '../../hooks/usePlans';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

export default function RoutinesScreen() {
    const router = useRouter();
    const {
        routines,
        loading,
        fetchRoutines,
        createRoutine,
        updateRoutine,
        deleteRoutine,
        duplicateRoutine,
    } = useRoutines();
    const { plans, loading: plansLoading, fetchPlans, getPlanDetails, createPlan, updatePlan, deletePlan } =
        usePlans();

    const [routineModal, setRoutineModal] = useState<{ open: boolean; editing: RoutineWithExercises | null }>({
        open: false,
        editing: null,
    });
    const [planModal, setPlanModal] = useState<{ open: boolean; editing: PlanWithRoutines | null }>({
        open: false,
        editing: null,
    });

    const refresh = useCallback(async () => {
        await Promise.all([fetchRoutines(), fetchPlans()]);
    }, [fetchRoutines, fetchPlans]);

    useRefreshOnFocus(refresh);

    const openRoutineMenu = (routine: RoutineWithExercises) => {
        Alert.alert(routine.name, undefined, [
            { text: 'Empezar entrenamiento', onPress: () => router.navigate(`/workout?routineId=${routine.id}`) },
            { text: 'Editar', onPress: () => setRoutineModal({ open: true, editing: routine }) },
            {
                text: 'Duplicar',
                onPress: async () => {
                    await duplicateRoutine(routine.id);
                },
            },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () =>
                    Alert.alert(
                        'Eliminar rutina',
                        `Se eliminará "${routine.name}" y se quitará de los programas que la usen. El historial de entrenamientos se conserva.`,
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                                text: 'Eliminar',
                                style: 'destructive',
                                onPress: async () => {
                                    await deleteRoutine(routine.id);
                                    await fetchPlans();
                                },
                            },
                        ]
                    ),
            },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    const openPlanMenu = async (planId: string, planName: string) => {
        Alert.alert(planName, undefined, [
            {
                text: 'Ver programa',
                onPress: () => router.push(`/plan/${planId}`),
            },
            {
                text: 'Editar',
                onPress: async () => {
                    const details = await getPlanDetails(planId);
                    if (details) setPlanModal({ open: true, editing: details });
                },
            },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () =>
                    Alert.alert('Eliminar programa', `¿Eliminar "${planName}"? Las rutinas se conservan.`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => deletePlan(planId) },
                    ]),
            },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                eyebrow="Organiza tus"
                title="Rutinas"
                actions={[
                    {
                        icon: 'calendar',
                        variant: 'secondary',
                        accessibilityLabel: 'Crear programa',
                        onPress: () => setPlanModal({ open: true, editing: null }),
                    },
                    {
                        icon: 'add',
                        variant: 'primary',
                        accessibilityLabel: 'Crear rutina',
                        onPress: () => setRoutineModal({ open: true, editing: null }),
                    },
                ]}
            />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={loading || plansLoading}
                        onRefresh={refresh}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {plans.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader icon="calendar" color={COLORS.textMuted} title="Mis programas" count={plans.length} />
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                onPress={() => router.push(`/plan/${plan.id}`)}
                                onLongPress={() => openPlanMenu(plan.id, plan.name)}
                            />
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <SectionHeader
                        icon="barbell"
                        color={COLORS.textMuted}
                        title="Rutinas individuales"
                        count={routines.length}
                    />

                    {routines.length === 0 && !loading ? (
                        <EmptyState
                            icon="barbell-outline"
                            title="No tienes rutinas"
                            message="Crea tu primera rutina para entrenar de forma estructurada y llevar el progreso de cada ejercicio."
                            actionLabel="Crear rutina"
                            onAction={() => setRoutineModal({ open: true, editing: null })}
                        />
                    ) : (
                        <View style={styles.routinesList}>
                            {routines.map((routine) => (
                                <RoutineCard
                                    key={routine.id}
                                    routine={routine}
                                    onPress={() => router.push(`/routine/${routine.id}`)}
                                    onStart={() => router.navigate(`/workout?routineId=${routine.id}`)}
                                    onMenu={() => openRoutineMenu(routine)}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <CreateRoutineModal
                visible={routineModal.open}
                onClose={() => setRoutineModal({ open: false, editing: null })}
                onCreate={createRoutine}
                onUpdate={updateRoutine}
                initialData={routineModal.editing}
            />
            <CreatePlanModal
                visible={planModal.open}
                onClose={() => setPlanModal({ open: false, editing: null })}
                onCreate={createPlan}
                onUpdate={updatePlan}
                initialData={planModal.editing}
            />
        </View>
    );
}

function SectionHeader({
    icon,
    color,
    title,
    count,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    title: string;
    count: number;
}) {
    return (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
                <Ionicons name={icon} size={16} color={color} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <Text style={styles.sectionCount}>{count}</Text>
        </View>
    );
}

const RoutineCard = React.memo(function RoutineCard({
    routine,
    onPress,
    onStart,
    onMenu,
}: {
    routine: RoutineWithExercises;
    onPress: () => void;
    onStart: () => void;
    onMenu: () => void;
}) {
    const muscleGroups = Array.from(
        new Set(routine.routine_exercises.map((re) => re.exercise.muscle_group).filter(Boolean))
    );
    const totalSets = routine.routine_exercises.reduce((sum, re) => sum + re.target_sets, 0);
    const exerciseCount = routine.routine_exercises.length;
    const accent = getMuscleColor(muscleGroups[0]);

    return (
        <TouchableOpacity style={styles.routineCard} onPress={onPress} onLongPress={onMenu} activeOpacity={0.75}>
            <View style={styles.routineGradient}>
                <View style={[styles.accentBar, { backgroundColor: accent }]} />

                <View style={styles.routineContent}>
                    <View style={styles.routineHeader}>
                        <View style={styles.routineInfo}>
                            <Text style={styles.routineName} numberOfLines={2}>
                                {routine.name}
                            </Text>
                            {routine.description && (
                                <Text style={styles.routineDescription} numberOfLines={1}>
                                    {routine.description}
                                </Text>
                            )}
                        </View>

                        <View style={styles.actionButtons}>
                            {/* Starting a routine is the point of this screen: give it a real button. */}
                            <TouchableOpacity
                                style={styles.startBtn}
                                onPress={onStart}
                                accessibilityRole="button"
                                accessibilityLabel={`Empezar ${routine.name}`}
                            >
                                <Ionicons name="play" size={16} color={COLORS.onChalk} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={onMenu}
                                accessibilityRole="button"
                                accessibilityLabel={`Opciones de ${routine.name}`}
                            >
                                <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {muscleGroups.length > 0 && (
                        <View style={styles.muscleGroupsRow}>
                            {muscleGroups.slice(0, 4).map((group) => (
                                <View
                                    key={group}
                                    style={[styles.muscleGroupPill, { backgroundColor: getMuscleColor(group) + '20' }]}
                                >
                                    <View style={[styles.muscleGroupDot, { backgroundColor: getMuscleColor(group) }]} />
                                    <Text style={[styles.muscleGroupText, { color: getMuscleColor(group) }]}>
                                        {group}
                                    </Text>
                                </View>
                            ))}
                            {muscleGroups.length > 4 && (
                                <Text style={styles.moreGroups}>+{muscleGroups.length - 4}</Text>
                            )}
                        </View>
                    )}

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{routine.calculatedDuration}</Text>
                            <Text style={styles.statLabel}>min</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{exerciseCount}</Text>
                            <Text style={styles.statLabel}>ejercicios</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{totalSets}</Text>
                            <Text style={styles.statLabel}>series</Text>
                        </View>
                    </View>

                    {exerciseCount > 0 && (
                        <Text style={styles.exercisePreviewList} numberOfLines={1}>
                            {routine.routine_exercises
                                .slice(0, 3)
                                .map((re) => re.exercise.name)
                                .join(' · ')}
                            {exerciseCount > 3 ? ` +${exerciseCount - 3} más` : ''}
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xxl,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    sectionTitle: {
        fontFamily: FONTS.medium,
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
    },
    sectionCount: {
        fontFamily: FONTS.display,
        fontSize: 14,
        color: COLORS.textMuted,
        fontVariant: ['tabular-nums'],
    },
    routinesList: {
        gap: SPACING.md,
    },
    routineCard: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
    },
    routineGradient: {
        flexDirection: 'row',
    },
    accentBar: {
        width: 3,
    },
    routineContent: {
        flex: 1,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    routineHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    routineInfo: {
        flex: 1,
    },
    routineName: {
        fontFamily: FONTS.display,
        fontSize: 20,
        lineHeight: 22,
        color: COLORS.textPrimary,
    },
    routineDescription: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    startBtn: {
        width: 34,
        height: 34,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 2,
    },
    actionBtn: {
        width: 34,
        height: 34,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceLight,
    },
    muscleGroupsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
    },
    muscleGroupPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
        gap: 5,
    },
    muscleGroupDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    muscleGroupText: {
        fontFamily: FONTS.semibold,
        fontSize: 10,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    moreGroups: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontFamily: FONTS.semibold,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: SPACING.md,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontFamily: FONTS.display,
        fontSize: 17,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontFamily: FONTS.regular,
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    exercisePreviewList: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.surfaceHighlight,
        paddingTop: SPACING.sm,
    },
});
