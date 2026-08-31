import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor } from '../../constants/colors';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { CreateRoutineModal } from '../../components/routines/CreateRoutineModal';
import { useRoutines, RoutineWithExercises } from '../../hooks/useRoutines';
import { formatMinutes, formatSeconds } from '../../lib/utils';

export default function RoutineDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { getRoutineDetails, updateRoutine, deleteRoutine, duplicateRoutine } = useRoutines();

    const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        const data = await getRoutineDetails(id);
        setRoutine(data);
        setLoading(false);
    }, [id, getRoutineDetails]);

    useEffect(() => {
        void load();
    }, [load]);

    const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/routines'));

    const openMenu = () => {
        if (!routine) return;
        Alert.alert(routine.name, undefined, [
            { text: 'Editar', onPress: () => setEditing(true) },
            {
                text: 'Duplicar',
                onPress: async () => {
                    const copy = await duplicateRoutine(routine.id);
                    if (copy) router.replace(`/routine/${copy.id}`);
                },
            },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () =>
                    Alert.alert(
                        'Eliminar rutina',
                        'Se quitará también de los programas que la usen. El historial se conserva.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                                text: 'Eliminar',
                                style: 'destructive',
                                onPress: async () => {
                                    await deleteRoutine(routine.id);
                                    goBack();
                                },
                            },
                        ]
                    ),
            },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!routine) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Rutina" onBack={goBack} />
                <View style={styles.content}>
                    <EmptyState
                        icon="alert-circle-outline"
                        title="Rutina no encontrada"
                        message="Puede que se haya eliminado."
                        actionLabel="Volver"
                        onAction={goBack}
                    />
                </View>
            </View>
        );
    }

    const totalSets = routine.routine_exercises.reduce((sum, re) => sum + re.target_sets, 0);
    const muscleGroups = Array.from(
        new Set(routine.routine_exercises.map((re) => re.exercise.muscle_group).filter(Boolean))
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                eyebrow="Rutina"
                title={routine.name}
                onBack={goBack}
                actions={[
                    { icon: 'ellipsis-horizontal', accessibilityLabel: 'Opciones de la rutina', onPress: openMenu },
                ]}
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <LinearGradient
                    colors={[routine.durationColor + '22', COLORS.surface]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    {routine.description ? (
                        <Text style={styles.description}>{routine.description}</Text>
                    ) : null}

                    <View style={styles.statsGrid}>
                        <Stat
                            icon="time"
                            tint={routine.durationColor}
                            value={String(routine.calculatedDuration)}
                            label="minutos"
                        />
                        <Stat
                            icon="fitness"
                            tint={COLORS.info}
                            value={String(routine.routine_exercises.length)}
                            label="ejercicios"
                        />
                        <Stat icon="layers" tint={COLORS.success} value={String(totalSets)} label="series" />
                    </View>

                    <View style={[styles.durationBadge, { backgroundColor: routine.durationColor + '20' }]}>
                        <Ionicons name="speedometer" size={13} color={routine.durationColor} />
                        <Text style={[styles.durationBadgeText, { color: routine.durationColor }]}>
                            Entrenamiento {routine.durationLabel.toLowerCase()} ·{' '}
                            {formatMinutes(routine.calculatedDuration)}
                        </Text>
                    </View>

                    {muscleGroups.length > 0 && (
                        <View style={styles.muscleRow}>
                            {muscleGroups.map((group) => (
                                <View
                                    key={group}
                                    style={[styles.musclePill, { backgroundColor: getMuscleColor(group) + '20' }]}
                                >
                                    <Text style={[styles.musclePillText, { color: getMuscleColor(group) }]}>
                                        {group}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </LinearGradient>

                <Text style={styles.sectionTitle}>Ejercicios</Text>

                {routine.routine_exercises.length === 0 ? (
                    <EmptyState
                        icon="barbell-outline"
                        title="Rutina vacía"
                        message="Añade ejercicios para poder entrenarla."
                        actionLabel="Editar rutina"
                        onAction={() => setEditing(true)}
                    />
                ) : (
                    <View style={styles.exercisesList}>
                        {routine.routine_exercises.map((item, index) => {
                            const color = getMuscleColor(item.exercise.muscle_group);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.exerciseCard}
                                    onPress={() => router.push(`/exercise/${item.exercise_id}`)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[styles.exerciseOrder, { backgroundColor: color + '22' }]}>
                                        <Text style={[styles.orderText, { color }]}>{index + 1}</Text>
                                    </View>

                                    <View style={styles.exerciseContent}>
                                        <Text style={styles.exerciseName}>{item.exercise.name}</Text>

                                        <View style={styles.exerciseDetails}>
                                            <Detail icon="repeat" tint={COLORS.primary}>
                                                {item.target_sets} × {item.target_reps}
                                            </Detail>
                                            <Detail icon="hourglass-outline" tint={COLORS.warning}>
                                                {formatSeconds(item.rest_seconds)}
                                            </Detail>
                                            <Detail icon="speedometer-outline" tint={COLORS.textMuted}>
                                                {item.time_per_rep_seconds}s/rep
                                            </Detail>
                                        </View>

                                        {/* Coaching notes finally render as text instead of a JSON blob. */}
                                        {item.notes ? <Text style={styles.exerciseNotes}>{item.notes}</Text> : null}
                                    </View>

                                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* The whole point of opening a routine is to train it. */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
                <Button
                    title="Empezar entrenamiento"
                    variant="gradient"
                    size="lg"
                    fullWidth
                    disabled={routine.routine_exercises.length === 0}
                    onPress={() => router.navigate(`/workout?routineId=${routine.id}`)}
                    icon={<Ionicons name="play" size={18} color="#FFF" />}
                />
            </View>

            <CreateRoutineModal
                visible={editing}
                initialData={routine}
                onClose={() => setEditing(false)}
                onUpdate={async (routineId, name, description, exercises) => {
                    await updateRoutine(routineId, name, description, exercises);
                    await load();
                }}
            />
        </View>
    );
}

function Stat({
    icon,
    tint,
    value,
    label,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    tint: string;
    value: string;
    label: string;
}) {
    return (
        <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: tint + '20' }]}>
                <Ionicons name={icon} size={18} color={tint} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function Detail({
    icon,
    tint,
    children,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    tint: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.detailItem}>
            <Ionicons name={icon} size={12} color={tint} />
            <Text style={styles.detailText}>{children}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xxl,
    },
    heroCard: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        gap: SPACING.md,
    },
    description: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    statsGrid: {
        flexDirection: 'row',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statIconBg: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    durationBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    muscleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    musclePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    musclePillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: SPACING.xl,
        marginBottom: SPACING.md,
    },
    exercisesList: {
        gap: SPACING.sm,
    },
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    exerciseOrder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '800',
    },
    exerciseContent: {
        flex: 1,
        gap: 4,
    },
    exerciseName: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    exerciseDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    exerciseNotes: {
        fontSize: 11,
        color: COLORS.textMuted,
        lineHeight: 16,
        marginTop: 2,
    },
    footer: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
    },
});
