import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor, HIT_SIZE } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { RoutineWithExercises, RoutineExerciseInput } from '../../hooks/useRoutines';
import { useExercises } from '../../hooks/useExercises';
import { Exercise } from '../../lib/database.types';
import { estimateRoutineMinutes, getDurationLabel } from '../../lib/durationCalculator';
import { formatSeconds, parseTargetReps } from '../../lib/utils';
import { showAlert, showConfirm } from '../../lib/dialog';

const REST_TIME_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180];
const TIME_PER_REP_OPTIONS = [2, 3, 4, 5];
const TEMPO_HINTS: Record<number, string> = {
    2: 'Rápido',
    3: 'Normal',
    4: 'Controlado',
    5: 'Lento',
};

/** One exercise while the routine is being built. */
interface DraftExercise {
    exercise: Exercise;
    sets: number;
    /** Free text so ranges like "8-10" survive a round trip. */
    reps: string;
    restTime: number;
    timePerRep: number;
    notes: string;
}

interface CreateRoutineModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate?: (name: string, description: string | null, exercises: RoutineExerciseInput[]) => Promise<unknown>;
    onUpdate?: (
        id: string,
        name: string,
        description: string | null,
        exercises: RoutineExerciseInput[]
    ) => Promise<unknown>;
    initialData?: RoutineWithExercises | null;
}

export function CreateRoutineModal({ visible, onClose, onCreate, onUpdate, initialData }: CreateRoutineModalProps) {
    const insets = useSafeAreaInsets();
    const { exercises: catalogue } = useExercises();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [drafts, setDrafts] = useState<DraftExercise[]>([]);
    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState(false);

    const reset = () => {
        setStep(1);
        setName('');
        setDescription('');
        setDrafts([]);
        setQuery('');
    };

    /**
     * Rehydrates the builder when editing.
     *
     * Rest and tempo are read from their own columns — the old version called
     * `JSON.parse(re.notes)` unguarded, which threw on any routine whose notes
     * were plain coaching text and made those routines impossible to edit.
     */
    useEffect(() => {
        if (!visible) return;

        if (!initialData) {
            reset();
            return;
        }

        setStep(1);
        setQuery('');
        setName(initialData.name);
        setDescription(initialData.description ?? '');
        setDrafts(
            initialData.routine_exercises.map((slot) => ({
                exercise: {
                    id: slot.exercise_id,
                    name: slot.exercise.name,
                    muscle_group: slot.exercise.muscle_group,
                    equipment: slot.exercise.equipment,
                    notes: null,
                    created_at: '',
                    time_per_rep_seconds: slot.exercise.time_per_rep_seconds,
                    default_rest_seconds: slot.exercise.default_rest_seconds,
                },
                sets: slot.target_sets,
                reps: slot.target_reps,
                restTime: slot.rest_seconds,
                timePerRep: slot.time_per_rep_seconds,
                notes: slot.notes ?? '',
            }))
        );
    }, [visible, initialData]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return catalogue;
        return catalogue.filter(
            (e) => e.name.toLowerCase().includes(needle) || e.muscle_group.toLowerCase().includes(needle)
        );
    }, [catalogue, query]);

    /** Live estimate, using exactly the same maths the saved routine will use. */
    const estimatedMinutes = useMemo(
        () =>
            estimateRoutineMinutes(
                drafts.map((d) => ({
                    sets: d.sets,
                    reps: parseTargetReps(d.reps),
                    timePerRepSeconds: d.timePerRep,
                    restBetweenSetsSeconds: d.restTime,
                }))
            ),
        [drafts]
    );

    const toggleExercise = (exercise: Exercise) => {
        setDrafts((prev) =>
            prev.some((d) => d.exercise.id === exercise.id)
                ? prev.filter((d) => d.exercise.id !== exercise.id)
                : [
                      ...prev,
                      {
                          exercise,
                          sets: 3,
                          reps: '10',
                          restTime: exercise.default_rest_seconds || 90,
                          timePerRep: exercise.time_per_rep_seconds || 3,
                          notes: '',
                      },
                  ]
        );
    };

    const patchDraft = (id: string, updates: Partial<DraftExercise>) =>
        setDrafts((prev) => prev.map((d) => (d.exercise.id === id ? { ...d, ...updates } : d)));

    const moveDraft = (index: number, direction: -1 | 1) =>
        setDrafts((prev) => {
            const target = index + direction;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });

    const goNext = () => {
        if (step === 1) {
            if (!name.trim()) {
                showAlert('Falta el nombre', 'Ponle un nombre a la rutina para poder guardarla.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (drafts.length === 0) {
                showAlert('Sin ejercicios', 'Selecciona al menos un ejercicio.');
                return;
            }
            setStep(3);
        }
    };

    const handleSave = async () => {
        const payload: RoutineExerciseInput[] = drafts.map((d) => ({
            id: d.exercise.id,
            sets: d.sets,
            reps: d.reps.trim() || '10',
            restTime: d.restTime,
            timePerRep: d.timePerRep,
            notes: d.notes.trim() || null,
        }));

        try {
            setSaving(true);
            if (initialData && onUpdate) {
                await onUpdate(initialData.id, name, description || null, payload);
            } else if (onCreate) {
                await onCreate(name, description || null, payload);
            }
            reset();
            onClose();
        } catch (error) {
            console.error('[routine-builder] save failed:', error);
            showAlert('Error', 'No se pudo guardar la rutina.');
        } finally {
            setSaving(false);
        }
    };

    const requestClose = () => {
        const dirty = name.trim().length > 0 || drafts.length > 0;
        if (!dirty) {
            onClose();
            return;
        }
        showConfirm({
            title: 'Descartar cambios',
            message: 'Perderás lo que has configurado en esta rutina.',
            confirmLabel: 'Descartar',
            cancelLabel: 'Seguir editando',
            onConfirm: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={requestClose}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>
                            {step === 1 ? (initialData ? 'Editar rutina' : 'Nueva rutina') : null}
                            {step === 2 ? 'Elegir ejercicios' : null}
                            {step === 3 ? 'Configurar' : null}
                        </Text>
                        <Text style={styles.stepCounter}>Paso {step} de 3</Text>
                    </View>
                    <TouchableOpacity onPress={requestClose} style={styles.closeBtn} accessibilityLabel="Cerrar">
                        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.progressContainer}>
                    {[1, 2, 3].map((s) => (
                        <View key={s} style={[styles.progressBar, s <= step && styles.progressBarActive]} />
                    ))}
                </View>

                {step === 1 && (
                    <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Push A — Fuerza"
                                placeholderTextColor={COLORS.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoFocus={!initialData}
                                returnKeyType="next"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Descripción (opcional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Objetivo o enfoque de esta rutina…"
                                placeholderTextColor={COLORS.textMuted}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>
                    </ScrollView>
                )}

                {step === 2 && (
                    <View style={styles.stepFlex}>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color={COLORS.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar ejercicio…"
                                placeholderTextColor={COLORS.textMuted}
                                value={query}
                                onChangeText={setQuery}
                                autoCorrect={false}
                            />
                        </View>

                        <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
                            {filtered.length === 0 ? (
                                <EmptyState
                                    icon="search-outline"
                                    title="Sin resultados"
                                    message="Prueba con otro nombre o crea el ejercicio desde la pestaña Ejercicios."
                                />
                            ) : (
                                filtered.map((exercise) => {
                                    const selected = drafts.some((d) => d.exercise.id === exercise.id);
                                    return (
                                        <TouchableOpacity
                                            key={exercise.id}
                                            style={[styles.exerciseItem, selected && styles.exerciseItemSelected]}
                                            onPress={() => toggleExercise(exercise)}
                                        >
                                            <View
                                                style={[
                                                    styles.exerciseDot,
                                                    { backgroundColor: getMuscleColor(exercise.muscle_group) },
                                                ]}
                                            />
                                            <View style={styles.exerciseItemBody}>
                                                <Text style={styles.exerciseName}>{exercise.name}</Text>
                                                <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
                                            </View>
                                            <Ionicons
                                                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                                                size={24}
                                                color={selected ? COLORS.success : COLORS.surfaceHighlight}
                                            />
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>

                        <View style={styles.summaryBar}>
                            <Text style={styles.summaryText}>
                                {drafts.length} {drafts.length === 1 ? 'ejercicio' : 'ejercicios'}
                            </Text>
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.estimateBanner}>
                            <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.estimateText}>
                                Duración estimada{' '}
                                <Text style={styles.estimateValue}>{estimatedMinutes} min</Text> ·{' '}
                                {getDurationLabel(estimatedMinutes).toLowerCase()}
                            </Text>
                        </View>

                        {drafts.map((draft, index) => (
                            <View key={draft.exercise.id} style={styles.configCard}>
                                <View style={styles.configHeader}>
                                    <Text
                                        style={[
                                            styles.configIndex,
                                            { backgroundColor: getMuscleColor(draft.exercise.muscle_group) + '25' },
                                        ]}
                                    >
                                        {index + 1}
                                    </Text>
                                    <View style={styles.configInfo}>
                                        <Text style={styles.configName}>{draft.exercise.name}</Text>
                                        <Text style={styles.configMuscle}>{draft.exercise.muscle_group}</Text>
                                    </View>
                                    {/* Order decides the order of the workout, so it has to be editable. */}
                                    <View style={styles.reorderColumn}>
                                        <TouchableOpacity
                                            onPress={() => moveDraft(index, -1)}
                                            disabled={index === 0}
                                            style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                                            accessibilityLabel="Subir ejercicio"
                                        >
                                            <Ionicons name="chevron-up" size={16} color={COLORS.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => moveDraft(index, 1)}
                                            disabled={index === drafts.length - 1}
                                            style={[
                                                styles.reorderBtn,
                                                index === drafts.length - 1 && styles.reorderBtnDisabled,
                                            ]}
                                            accessibilityLabel="Bajar ejercicio"
                                        >
                                            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.configRow}>
                                    <View style={styles.configField}>
                                        <Text style={styles.configFieldLabel}>Series</Text>
                                        <View style={styles.stepper}>
                                            <TouchableOpacity
                                                style={styles.stepperBtn}
                                                onPress={() =>
                                                    patchDraft(draft.exercise.id, { sets: Math.max(1, draft.sets - 1) })
                                                }
                                                accessibilityLabel="Quitar una serie"
                                            >
                                                <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                                            </TouchableOpacity>
                                            <Text style={styles.stepperValue}>{draft.sets}</Text>
                                            <TouchableOpacity
                                                style={styles.stepperBtn}
                                                onPress={() =>
                                                    patchDraft(draft.exercise.id, { sets: Math.min(12, draft.sets + 1) })
                                                }
                                                accessibilityLabel="Añadir una serie"
                                            >
                                                <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.configField}>
                                        {/* Free text: "8-10", "15", "10 por pierna"… */}
                                        <Text style={styles.configFieldLabel}>Repeticiones</Text>
                                        <TextInput
                                            style={styles.repsInput}
                                            value={draft.reps}
                                            onChangeText={(reps) => patchDraft(draft.exercise.id, { reps })}
                                            placeholder="8-10"
                                            placeholderTextColor={COLORS.textMuted}
                                            maxLength={16}
                                        />
                                    </View>
                                </View>

                                <ChipRow
                                    icon="timer-outline"
                                    label="Descanso"
                                    options={REST_TIME_OPTIONS}
                                    value={draft.restTime}
                                    format={formatSeconds}
                                    activeColor={COLORS.primary}
                                    onSelect={(restTime) => patchDraft(draft.exercise.id, { restTime })}
                                />

                                <ChipRow
                                    icon="speedometer-outline"
                                    label={`Tiempo por rep · ${TEMPO_HINTS[draft.timePerRep] ?? ''}`}
                                    options={TIME_PER_REP_OPTIONS}
                                    value={draft.timePerRep}
                                    format={(v) => `${v}s`}
                                    activeColor={COLORS.primary}
                                    onSelect={(timePerRep) => patchDraft(draft.exercise.id, { timePerRep })}
                                />

                                <TextInput
                                    style={styles.notesInput}
                                    value={draft.notes}
                                    onChangeText={(notes) => patchDraft(draft.exercise.id, { notes })}
                                    placeholder="Notas de técnica (opcional)…"
                                    placeholderTextColor={COLORS.textMuted}
                                    multiline
                                />
                            </View>
                        ))}
                    </ScrollView>
                )}

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
                    {step > 1 && (
                        <Button
                            title="Atrás"
                            variant="secondary"
                            onPress={() => setStep((s) => (s === 3 ? 2 : 1))}
                            style={styles.footerBtn}
                        />
                    )}
                    <Button
                        title={step === 3 ? (initialData ? 'Guardar cambios' : 'Crear rutina') : 'Continuar'}
                        variant="gradient"
                        onPress={step === 3 ? handleSave : goNext}
                        loading={saving}
                        style={styles.footerBtnPrimary}
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function ChipRow({
    icon,
    label,
    options,
    value,
    format,
    activeColor,
    onSelect,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    options: number[];
    value: number;
    format: (value: number) => string;
    activeColor: string;
    onSelect: (value: number) => void;
}) {
    return (
        <View style={styles.chipSection}>
            <View style={styles.chipLabelRow}>
                <Ionicons name={icon} size={13} color={COLORS.textMuted} />
                <Text style={styles.configFieldLabel}>{label}</Text>
            </View>
            <View style={styles.chipRow}>
                {options.map((option) => {
                    const active = option === value;
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[styles.chip, active && { backgroundColor: activeColor }]}
                            onPress={() => onSelect(option)}
                        >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{format(option)}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontFamily: FONTS.display,
        color: COLORS.textPrimary,
    },
    stepCounter: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    closeBtn: {
        width: HIT_SIZE,
        height: HIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
    },
    progressBar: {
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: COLORS.surfaceHighlight,
    },
    progressBarActive: {
        backgroundColor: COLORS.primary,
    },
    stepFlex: {
        flex: 1,
    },
    stepContent: {
        padding: SPACING.md,
        paddingBottom: SPACING.xl,
        gap: SPACING.md,
    },
    inputGroup: {
        gap: SPACING.xs,
    },
    label: {
        fontSize: FONT_SIZES.xs,
        fontFamily: FONTS.bold,
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
        minHeight: 90,
        textAlignVertical: 'top',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginHorizontal: SPACING.md,
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
    listContent: {
        padding: SPACING.md,
        gap: SPACING.xs,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    exerciseItemSelected: {
        borderColor: COLORS.success + '80',
        backgroundColor: COLORS.success + '0D',
    },
    exerciseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    exerciseItemBody: {
        flex: 1,
    },
    exerciseName: {
        fontSize: FONT_SIZES.sm,
        fontFamily: FONTS.semibold,
        color: COLORS.textPrimary,
    },
    exerciseMuscle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    summaryBar: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
    },
    summaryText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontFamily: FONTS.semibold,
        textAlign: 'center',
    },
    estimateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surface,
    },
    estimateValue: {
        fontFamily: FONTS.display,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    estimateText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    configCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        padding: SPACING.md,
        gap: SPACING.md,
    },
    configHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    configIndex: {
        width: 28,
        height: 28,
        borderRadius: 14,
        textAlign: 'center',
        lineHeight: 28,
        fontFamily: FONTS.display,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        overflow: 'hidden',
    },
    configInfo: {
        flex: 1,
    },
    configName: {
        fontSize: FONT_SIZES.md,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
    },
    configMuscle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    reorderColumn: {
        gap: 3,
    },
    reorderBtn: {
        width: 30,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.sm,
    },
    reorderBtnDisabled: {
        opacity: 0.3,
    },
    configRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    configField: {
        flex: 1,
        gap: SPACING.xs,
    },
    configFieldLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        fontFamily: FONTS.semibold,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.sm,
        padding: 4,
    },
    stepperBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.sm,
    },
    stepperValue: {
        fontSize: FONT_SIZES.md,
        fontFamily: FONTS.display,
        color: COLORS.textPrimary,
    },
    repsInput: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.sm,
        paddingVertical: 10,
        paddingHorizontal: SPACING.sm,
        textAlign: 'center',
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontFamily: FONTS.bold,
    },
    chipSection: {
        gap: SPACING.xs,
    },
    chipLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceLight,
    },
    chipText: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
    },
    chipTextActive: {
        color: COLORS.onChalk,
    },
    notesInput: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.sm,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        minHeight: 44,
        textAlignVertical: 'top',
    },
    footer: {
        flexDirection: 'row',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
        backgroundColor: COLORS.surface,
    },
    footerBtn: {
        flex: 1,
    },
    footerBtnPrimary: {
        flex: 2,
    },
});
