import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/colors';
import { clearAllData, seedDatabase, storage } from '../lib/localDatabase';
import { useWorkoutStore } from '../store/workoutStore';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { formatVolume } from '../lib/utils';

interface Counts {
    exercises: number;
    routines: number;
    plans: number;
    sessions: number;
    sets: number;
    volume: number;
}

const EMPTY: Counts = { exercises: 0, routines: 0, plans: 0, sessions: 0, sets: 0, volume: 0 };

export default function SettingsScreen() {
    const router = useRouter();
    const [counts, setCounts] = useState<Counts>(EMPTY);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const [exercises, routines, plans, sessions, logs] = await Promise.all([
            storage.exercises.getAll(),
            storage.routines.getAll(),
            storage.plans.getAll(),
            storage.workoutSessions.getAll(),
            storage.workoutLogs.getAll(),
        ]);

        const workSets = logs.filter((l) => !l.is_warmup);
        setCounts({
            exercises: exercises.length,
            routines: routines.length,
            plans: plans.length,
            sessions: sessions.length,
            sets: workSets.length,
            volume: workSets.reduce((sum, l) => sum + (Number(l.weight_kg) || 0) * (l.reps || 0), 0),
        });
    }, []);

    useRefreshOnFocus(load);
    React.useEffect(() => {
        void load();
    }, [load]);

    /**
     * Everything lives on this device only, so an export is the sole backup
     * path. Shared as JSON the user can save wherever they like.
     */
    const exportData = async () => {
        try {
            setBusy(true);
            const [exercises, routines, routineExercises, plans, planRoutines, sessions, logs, weights] =
                await Promise.all([
                    storage.exercises.getAll(),
                    storage.routines.getAll(),
                    storage.routineExercises.getAll(),
                    storage.plans.getAll(),
                    storage.planRoutines.getAll(),
                    storage.workoutSessions.getAll(),
                    storage.workoutLogs.getAll(),
                    storage.bodyWeight.getAll(),
                ]);

            const payload = JSON.stringify(
                {
                    exportedAt: new Date().toISOString(),
                    app: 'gym-tracker',
                    data: {
                        exercises,
                        routines,
                        routineExercises,
                        plans,
                        planRoutines,
                        sessions,
                        logs,
                        weights,
                    },
                },
                null,
                2
            );

            await Share.share({ message: payload, title: 'Copia de seguridad — Gym Tracker' });
        } catch (error) {
            console.error('[settings] export failed:', error);
            Alert.alert('Error', 'No se pudo generar la copia de seguridad.');
        } finally {
            setBusy(false);
        }
    };

    const restoreCatalogue = () => {
        Alert.alert(
            'Restaurar catálogo',
            'Se reemplazarán los ejercicios y rutinas por los de fábrica. Tu historial de entrenamientos y tu peso corporal no se tocan.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Restaurar',
                    style: 'destructive',
                    onPress: async () => {
                        setBusy(true);
                        await seedDatabase();
                        await load();
                        setBusy(false);
                        Alert.alert('Listo', 'Catálogo restaurado.');
                    },
                },
            ]
        );
    };

    const wipe = () => {
        Alert.alert(
            'Borrar todos los datos',
            'Se eliminarán ejercicios, rutinas, programas, entrenamientos y registros de peso. Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar todo',
                    style: 'destructive',
                    onPress: () =>
                        Alert.alert('¿Seguro?', 'Última confirmación antes de borrar todo.', [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                                text: 'Sí, borrar',
                                style: 'destructive',
                                onPress: async () => {
                                    setBusy(true);
                                    // The live session lives in memory too; leaving it
                                    // running would re-save data referencing wiped rows.
                                    useWorkoutStore.getState().endWorkout();
                                    await clearAllData();
                                    await seedDatabase();
                                    await load();
                                    setBusy(false);
                                    Alert.alert('Hecho', 'Se restauró la app a su estado inicial.');
                                },
                            },
                        ]),
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Ajustes" onBack={() => router.back()} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>Tus datos</Text>
                <View style={styles.card}>
                    <StatRow label="Ejercicios" value={String(counts.exercises)} />
                    <StatRow label="Rutinas" value={String(counts.routines)} />
                    <StatRow label="Programas" value={String(counts.plans)} />
                    <StatRow label="Entrenamientos" value={String(counts.sessions)} />
                    <StatRow label="Series registradas" value={String(counts.sets)} />
                    <StatRow label="Volumen acumulado" value={formatVolume(counts.volume)} last />
                </View>

                <Text style={styles.sectionLabel}>Copia de seguridad</Text>
                <View style={styles.card}>
                    <ActionRow
                        icon="share-outline"
                        title="Exportar datos"
                        subtitle="Comparte un JSON con todo tu historial"
                        onPress={exportData}
                        disabled={busy}
                    />
                    <ActionRow
                        icon="refresh-outline"
                        title="Restaurar catálogo de fábrica"
                        subtitle="Repone ejercicios y rutinas base"
                        onPress={restoreCatalogue}
                        disabled={busy}
                        last
                    />
                </View>

                <Text style={[styles.sectionLabel, styles.dangerLabel]}>Zona peligrosa</Text>
                <View style={[styles.card, styles.dangerCard]}>
                    <ActionRow
                        icon="trash-outline"
                        title="Borrar todos los datos"
                        subtitle="Devuelve la app a su estado inicial"
                        onPress={wipe}
                        disabled={busy}
                        destructive
                        last
                    />
                </View>

                <Text style={styles.version}>
                    Gym Tracker v{Constants.expoConfig?.version ?? '1.0.0'} · datos guardados solo en este
                    dispositivo
                </Text>
            </ScrollView>
        </View>
    );
}

function StatRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
    return (
        <View style={[styles.row, last && styles.rowLast]}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

function ActionRow({
    icon,
    title,
    subtitle,
    onPress,
    disabled,
    destructive,
    last,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle: string;
    onPress: () => void;
    disabled?: boolean;
    destructive?: boolean;
    last?: boolean;
}) {
    const tint = destructive ? COLORS.error : COLORS.primary;
    return (
        <TouchableOpacity
            style={[styles.row, last && styles.rowLast, disabled && styles.rowDisabled]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
        >
            <View style={[styles.actionIcon, { backgroundColor: tint + '18' }]}>
                <Ionicons name={icon} size={18} color={tint} />
            </View>
            <View style={styles.actionBody}>
                <Text style={[styles.rowLabel, destructive && { color: COLORS.error }]}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
    );
}

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
    sectionLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
        marginTop: SPACING.md,
    },
    dangerLabel: {
        color: COLORS.error,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        paddingHorizontal: SPACING.md,
    },
    dangerCard: {
        borderColor: COLORS.error + '40',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    rowLast: {
        borderBottomWidth: 0,
    },
    rowDisabled: {
        opacity: 0.5,
    },
    rowLabel: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    rowSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    rowValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    actionIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBody: {
        flex: 1,
    },
    version: {
        marginTop: SPACING.xl,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
});
