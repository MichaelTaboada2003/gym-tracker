import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { CreateRoutineModal } from '../../components/routines/CreateRoutineModal';
import { useRoutines } from '../../hooks/useRoutines';
import { useWorkoutStore } from '../../store/workoutStore';
import { GradientText } from '../../components/ui/GradientText';
import { usePlans } from '../../hooks/usePlans';
import { PlanCard } from '../../components/plans/PlanCard';
import { CreatePlanModal } from '../../components/plans/CreatePlanModal';

export default function RoutinesScreen() {
    const router = useRouter();
    const { routines, loading, fetchRoutines, createRoutine, updateRoutine, deleteRoutine } = useRoutines();
    const { plans, loading: plansLoading, fetchPlans, createPlan } = usePlans();
    const { startWorkout, addExercise } = useWorkoutStore();
    const [isRoutineModalVisible, setIsRoutineModalVisible] = useState(false);
    const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);

    // State for editing
    const [editingRoutine, setEditingRoutine] = useState<any>(null);

    const handleEditRoutine = (routine: any) => {
        setEditingRoutine(routine);
        setIsRoutineModalVisible(true);
    };

    const handleCloseRoutineModal = () => {
        setIsRoutineModalVisible(false);
        setEditingRoutine(null);
    };

    const handleStartRoutine = (routine: any) => {
        // 1. Initialize workout
        startWorkout(routine.id, routine.name);

        // 2. Add exercises from routine
        routine.routine_exercises.forEach((re: any) => {
            // Mapping routine exercise to workout exercise
            // Note: We might need to fetch full exercise details if not present
            // For now assuming routine_exercises includes necessary exercise data
            addExercise({
                ...re.exercise,
                id: re.exercise_id,
            } as any, null, {
                targetSets: re.target_sets,
                targetReps: re.target_reps,
                notes: re.notes
            });
        });

        // 3. Navigate to workout tab
        router.push('/workout');
    };

    const handleDeleteRoutine = async (id: string) => {
        await deleteRoutine(id);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <GradientText style={styles.headerTitle} colors={COLORS.gradients.secondary}>
                    Mis Rutinas
                </GradientText>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <IconButton
                        icon={<Ionicons name="calendar-outline" size={20} color="#FFF" />}
                        variant="secondary"
                        onPress={() => setIsPlanModalVisible(true)}
                    />
                    <IconButton
                        icon={<Ionicons name="add" size={24} color="#FFF" />}
                        variant="primary"
                        onPress={() => setIsRoutineModalVisible(true)}
                    />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={loading || plansLoading} onRefresh={() => { fetchRoutines(); fetchPlans(); }} tintColor={COLORS.primary} />
                }
            >
                {/* Plans Section */}
                {plans.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Mis Programas</Text>
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                onPress={() => router.push(`/plan/${plan.id}`)}
                            />
                        ))}
                    </View>
                )}

                <Text style={styles.sectionTitle}>Rutinas Individuales</Text>

                {routines.length === 0 && plans.length === 0 && !loading ? (
                    <Card variant="glass" style={styles.emptyCard}>
                        <View style={styles.emptyState}>
                            <Ionicons name="clipboard-outline" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>No tienes contenido guardado</Text>
                            <Text style={styles.emptySubtext}>
                                Crea una rutina o un programa para organizar tus entrenamientos
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACING.md }}>
                                <Button
                                    title="Crear Rutina"
                                    onPress={() => setIsRoutineModalVisible(true)}
                                    variant="secondary"
                                />
                                <Button
                                    title="Crear Programa"
                                    onPress={() => setIsPlanModalVisible(true)}
                                    variant="primary"
                                />
                            </View>
                        </View>
                    </Card>
                ) : (
                    routines.map((routine) => (
                        <Card
                            key={routine.id}
                            variant="gradient"
                            style={styles.routineCard}
                            onPress={() => router.push(`/routine/${routine.id}`)}
                        >
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.routineName}>{routine.name}</Text>
                                    {routine.description && (
                                        <Text style={styles.routineDescription} numberOfLines={1}>
                                            {routine.description}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <IconButton
                                        icon={<Ionicons name="create-outline" size={18} color={COLORS.textHighlight} />}
                                        variant="ghost"
                                        size={32}
                                        onPress={() => handleEditRoutine(routine)}
                                    />
                                    <IconButton
                                        icon={<Ionicons name="trash-outline" size={18} color={COLORS.error} />}
                                        variant="ghost"
                                        size={32}
                                        onPress={() => handleDeleteRoutine(routine.id)}
                                    />
                                </View>
                            </View>

                            <View style={styles.cardStats}>
                                <View style={styles.statBadge}>
                                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.statText}>~{routine.estimated_duration} min</Text>
                                </View>
                                <View style={styles.statBadge}>
                                    <Ionicons name="barbell-outline" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.statText}>
                                        {routine.routine_exercises?.length || 0} Ejercicios
                                    </Text>
                                </View>
                            </View>
                        </Card>
                    ))
                )}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
    },
    content: {
        padding: SPACING.lg,
        paddingBottom: 100,
    },
    emptyCard: {
        minHeight: 200,
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        gap: SPACING.xs,
    },
    emptyText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: SPACING.md,
    },
    emptySubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    routineCard: {
        marginBottom: SPACING.lg,
        padding: SPACING.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    routineName: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    routineDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    cardStats: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginBottom: SPACING.md,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});
