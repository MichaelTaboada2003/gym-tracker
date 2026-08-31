import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    RefreshControl,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor, HIT_SIZE } from '../../constants/colors';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useExercises, ExerciseDraft } from '../../hooks/useExercises';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { Exercise } from '../../lib/database.types';
import { formatSeconds } from '../../lib/utils';

const MUSCLE_GROUPS = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Glúteos', 'Core', 'Cardio'];
const EQUIPMENT_OPTIONS = ['Barra', 'Mancuernas', 'Máquina', 'Polea', 'Peso corporal', 'Kettlebell', 'Bandas'];
const REST_OPTIONS = [45, 60, 75, 90, 105, 120, 150, 180];
const TEMPO_OPTIONS = [2, 3, 4, 5];

interface FormState {
    name: string;
    muscleGroup: string;
    equipment: string;
    notes: string;
    restSeconds: number;
    tempo: number;
}

const EMPTY_FORM: FormState = {
    name: '',
    muscleGroup: '',
    equipment: '',
    notes: '',
    restSeconds: 90,
    tempo: 3,
};

export default function ExercisesScreen() {
    const router = useRouter();
    const {
        exercises,
        loading,
        fetchExercises,
        createExercise,
        updateExercise,
        deleteExercise,
        countRoutineUsages,
    } = useExercises();

    useRefreshOnFocus(fetchExercises);

    const [query, setQuery] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
    const [editor, setEditor] = useState<{ open: boolean; editing: Exercise | null }>({
        open: false,
        editing: null,
    });

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return exercises.filter((ex) => {
            const matchesSearch =
                !needle ||
                ex.name.toLowerCase().includes(needle) ||
                ex.equipment.toLowerCase().includes(needle);
            return matchesSearch && (!selectedMuscle || ex.muscle_group === selectedMuscle);
        });
    }, [exercises, query, selectedMuscle]);

    /** How many exercises exist per muscle group, for the filter chip counts. */
    const countsByMuscle = useMemo(() => {
        const counts = new Map<string, number>();
        exercises.forEach((ex) => counts.set(ex.muscle_group, (counts.get(ex.muscle_group) ?? 0) + 1));
        return counts;
    }, [exercises]);

    /**
     * Confirms with `Alert`, not `window.confirm`.
     *
     * React Native defines a `window` global but no `confirm` on it, so the old
     * `if (typeof window !== 'undefined') window.confirm(...)` threw a TypeError
     * on device — deleting an exercise crashed the screen every time.
     */
    const confirmDelete = async (exercise: Exercise) => {
        const usages = await countRoutineUsages(exercise.id);
        const warning =
            usages > 0
                ? `Se quitará de ${usages} ${usages === 1 ? 'rutina' : 'rutinas'}. `
                : '';

        Alert.alert(
            'Eliminar ejercicio',
            `${warning}El historial de series que ya registraste se conserva.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deleteExercise(exercise.id),
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                eyebrow="Tu catálogo"
                title="Ejercicios"
                actions={[
                    {
                        icon: 'add',
                        variant: 'primary',
                        accessibilityLabel: 'Crear ejercicio',
                        onPress: () => setEditor({ open: true, editing: null }),
                    },
                ]}
            />

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={COLORS.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar ejercicio o material…"
                    placeholderTextColor={COLORS.textMuted}
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Limpiar búsqueda">
                        <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.filterWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                >
                    <FilterChip
                        label="Todos"
                        count={exercises.length}
                        active={!selectedMuscle}
                        color={COLORS.primary}
                        onPress={() => setSelectedMuscle(null)}
                    />
                    {MUSCLE_GROUPS.map((muscle) => (
                        <FilterChip
                            key={muscle}
                            label={muscle}
                            count={countsByMuscle.get(muscle) ?? 0}
                            active={selectedMuscle === muscle}
                            color={getMuscleColor(muscle)}
                            onPress={() => setSelectedMuscle(selectedMuscle === muscle ? null : muscle)}
                        />
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchExercises} tintColor={COLORS.primary} />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="barbell-outline"
                        title={query || selectedMuscle ? 'Sin coincidencias' : 'No hay ejercicios'}
                        message={
                            query || selectedMuscle
                                ? 'Prueba con otro término o quita el filtro de músculo.'
                                : 'Crea tu primer ejercicio para empezar a montar rutinas.'
                        }
                        actionLabel="Añadir ejercicio"
                        onAction={() => setEditor({ open: true, editing: null })}
                    />
                }
                renderItem={({ item }) => (
                    <ExerciseRow
                        exercise={item}
                        onPress={() => router.push(`/exercise/${item.id}`)}
                        onEdit={() => setEditor({ open: true, editing: item })}
                        onDelete={() => confirmDelete(item)}
                    />
                )}
            />

            <ExerciseEditor
                visible={editor.open}
                editing={editor.editing}
                onClose={() => setEditor({ open: false, editing: null })}
                onSubmit={async (draft) => {
                    if (editor.editing) await updateExercise(editor.editing.id, draft);
                    else await createExercise(draft);
                }}
            />
        </View>
    );
}

function FilterChip({
    label,
    count,
    active,
    color,
    onPress,
}: {
    label: string;
    count: number;
    active: boolean;
    color: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.filterChip,
                active && { backgroundColor: color + '25', borderColor: color },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
        >
            <Text style={[styles.filterText, active && { color }]}>{label}</Text>
            <Text style={[styles.filterCount, active && { color }]}>{count}</Text>
        </TouchableOpacity>
    );
}

const ExerciseRow = React.memo(function ExerciseRow({
    exercise,
    onPress,
    onEdit,
    onDelete,
}: {
    exercise: Exercise;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const color = getMuscleColor(exercise.muscle_group);

    return (
        <TouchableOpacity style={styles.exerciseCard} onPress={onPress} activeOpacity={0.75}>
            <View style={[styles.muscleIndicator, { backgroundColor: color }]} />

            <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <View style={styles.exerciseMeta}>
                    <Text style={[styles.exerciseMuscle, { color }]}>{exercise.muscle_group}</Text>
                    {exercise.equipment ? (
                        <>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.exerciseSecondary}>{exercise.equipment}</Text>
                        </>
                    ) : null}
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.exerciseSecondary}>
                        {formatSeconds(exercise.default_rest_seconds)} descanso
                    </Text>
                </View>
            </View>

            <View style={styles.exerciseActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onEdit}
                    accessibilityLabel={`Editar ${exercise.name}`}
                >
                    <Ionicons name="pencil" size={17} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onDelete}
                    accessibilityLabel={`Eliminar ${exercise.name}`}
                >
                    <Ionicons name="trash-outline" size={17} color={COLORS.error} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

/** Create / edit sheet. Kept at module scope so typing does not remount it. */
function ExerciseEditor({
    visible,
    editing,
    onClose,
    onSubmit,
}: {
    visible: boolean;
    editing: Exercise | null;
    onClose: () => void;
    onSubmit: (draft: ExerciseDraft) => Promise<void>;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setForm(
            editing
                ? {
                      name: editing.name,
                      muscleGroup: editing.muscle_group,
                      equipment: editing.equipment ?? '',
                      notes: editing.notes ?? '',
                      restSeconds: editing.default_rest_seconds,
                      tempo: editing.time_per_rep_seconds,
                  }
                : EMPTY_FORM
        );
    }, [visible, editing]);

    const patch = (updates: Partial<FormState>) => setForm((prev) => ({ ...prev, ...updates }));

    const submit = async () => {
        if (!form.name.trim()) {
            Alert.alert('Falta el nombre', 'Escribe cómo se llama el ejercicio.');
            return;
        }
        if (!form.muscleGroup) {
            Alert.alert('Falta el grupo muscular', 'Elige a qué músculo pertenece.');
            return;
        }

        try {
            setSaving(true);
            await onSubmit({
                name: form.name,
                muscle_group: form.muscleGroup,
                equipment: form.equipment,
                notes: form.notes,
                default_rest_seconds: form.restSeconds,
                time_per_rep_seconds: form.tempo,
            });
            onClose();
        } catch (error) {
            Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalClose} accessibilityLabel="Cerrar">
                        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                    <Field label="Nombre">
                        <TextInput
                            style={styles.input}
                            value={form.name}
                            onChangeText={(name) => patch({ name })}
                            placeholder="Ej: Press banca inclinado"
                            placeholderTextColor={COLORS.textMuted}
                            autoFocus={!editing}
                        />
                    </Field>

                    <Field label="Grupo muscular">
                        <View style={styles.optionRow}>
                            {MUSCLE_GROUPS.map((muscle) => {
                                const active = form.muscleGroup === muscle;
                                const color = getMuscleColor(muscle);
                                return (
                                    <TouchableOpacity
                                        key={muscle}
                                        onPress={() => patch({ muscleGroup: muscle })}
                                        style={[
                                            styles.option,
                                            active && { backgroundColor: color + '25', borderColor: color },
                                        ]}
                                    >
                                        <Text style={[styles.optionText, active && { color }]}>{muscle}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Material (opcional)">
                        <View style={styles.optionRow}>
                            {EQUIPMENT_OPTIONS.map((option) => {
                                const active = form.equipment === option;
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => patch({ equipment: active ? '' : option })}
                                        style={[styles.option, active && styles.optionActive]}
                                    >
                                        <Text style={[styles.optionText, active && styles.optionTextActive]}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Field>

                    {/* These two drive rest timers and duration estimates but had no UI. */}
                    <Field label="Descanso por defecto">
                        <View style={styles.optionRow}>
                            {REST_OPTIONS.map((option) => {
                                const active = form.restSeconds === option;
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => patch({ restSeconds: option })}
                                        style={[styles.option, active && styles.optionActive]}
                                    >
                                        <Text style={[styles.optionText, active && styles.optionTextActive]}>
                                            {formatSeconds(option)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Tiempo por repetición">
                        <View style={styles.optionRow}>
                            {TEMPO_OPTIONS.map((option) => {
                                const active = form.tempo === option;
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => patch({ tempo: option })}
                                        style={[styles.option, active && styles.optionActive]}
                                    >
                                        <Text style={[styles.optionText, active && styles.optionTextActive]}>
                                            {option}s
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Notas (opcional)">
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={form.notes}
                            onChangeText={(notes) => patch({ notes })}
                            placeholder="Detalles de técnica, agarre, ajustes de máquina…"
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                        />
                    </Field>
                </ScrollView>

                <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
                    <Button
                        title={editing ? 'Guardar cambios' : 'Crear ejercicio'}
                        variant="gradient"
                        size="lg"
                        fullWidth
                        loading={saving}
                        onPress={submit}
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginHorizontal: SPACING.lg,
        paddingHorizontal: SPACING.md,
        height: 46,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
    },
    filterWrapper: {
        paddingVertical: SPACING.md,
    },
    filterContent: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.xs,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    filterText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    filterCount: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    listContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xxl,
        gap: SPACING.sm,
    },
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        overflow: 'hidden',
        paddingRight: SPACING.xs,
    },
    muscleIndicator: {
        width: 4,
        alignSelf: 'stretch',
    },
    exerciseInfo: {
        flex: 1,
        paddingVertical: SPACING.md,
        paddingLeft: SPACING.md,
    },
    exerciseName: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    exerciseMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 3,
        flexWrap: 'wrap',
    },
    exerciseMuscle: {
        fontSize: 11,
        fontWeight: '700',
    },
    exerciseSecondary: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    metaDot: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    exerciseActions: {
        flexDirection: 'row',
        gap: 2,
    },
    actionButton: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 19,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    modalClose: {
        width: HIT_SIZE,
        height: HIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContent: {
        padding: SPACING.md,
        gap: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    modalFooter: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
        backgroundColor: COLORS.surface,
    },
    field: {
        gap: SPACING.sm,
    },
    fieldLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
    },
    textArea: {
        minHeight: 88,
        textAlignVertical: 'top',
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    option: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    optionActive: {
        backgroundColor: COLORS.primary + '25',
        borderColor: COLORS.primary,
    },
    optionText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    optionTextActive: {
        color: COLORS.primaryLight,
    },
});
