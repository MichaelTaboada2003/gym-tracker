import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { RoutineWithExercises } from '../../hooks/useRoutines';
import { useExercises } from '../../hooks/useExercises';
import { Exercise } from '../../lib/database.types';

const REST_TIME_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180]; // seconds (30s to 3min)
const TIME_PER_REP_OPTIONS = [2, 3, 4, 5]; // seconds per rep

export interface SelectedExercise extends Exercise {
    sets: number;
    reps: number;
    restTime: number; // in seconds
    timePerRep: number; // seconds per repetition
}

interface CreateRoutineModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate?: (name: string, description: string, exercises: SelectedExercise[]) => Promise<void>;
    onUpdate?: (id: string, name: string, description: string, exercises: SelectedExercise[]) => Promise<void>;
    initialData?: RoutineWithExercises | null;
}

export function CreateRoutineModal({ visible, onClose, onCreate, onUpdate, initialData }: CreateRoutineModalProps) {
    const { exercises: availableExercises } = useExercises();

    // Form State
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');

            const exercises: SelectedExercise[] = initialData.routine_exercises.map(re => {
                // Parse reps - handle strings like "10", "8-10", etc.
                let repsNum = 5;
                if (re.target_reps) {
                    const parsed = parseInt(re.target_reps.toString().split('-')[0], 10);
                    if (!isNaN(parsed)) repsNum = parsed;
                }

                return {
                    id: re.exercise_id,
                    name: re.exercise.name,
                    muscle_group: re.exercise.muscle_group,
                    equipment: re.exercise.equipment || '',
                    notes: null,
                    created_at: '',
                    time_per_rep_seconds: re.exercise.time_per_rep_seconds || 3,
                    default_rest_seconds: re.exercise.default_rest_seconds || 90,

                    sets: re.target_sets,
                    reps: repsNum,
                    restTime: re.notes ? (JSON.parse(re.notes).restTime || 90) : 90,
                    timePerRep: re.notes ? (JSON.parse(re.notes).timePerRep || re.exercise.time_per_rep_seconds || 3) : (re.exercise.time_per_rep_seconds || 3)
                };
            });

            setSelectedExercises(exercises);
        } else if (visible && !initialData) {
            resetForm();
        }
    }, [visible, initialData]);

    const handleNext = () => {
        if (step === 1) {
            if (!name.trim()) {
                Alert.alert('Error', 'Por favor ingresa un nombre para la rutina');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (selectedExercises.length === 0) {
                Alert.alert('Error', 'Selecciona al menos un ejercicio');
                return;
            }
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step === 2) setStep(1);
        if (step === 3) setStep(2);
    };

    const toggleExercise = (exercise: Exercise) => {
        const exists = selectedExercises.find(e => e.id === exercise.id);
        if (exists) {
            setSelectedExercises(prev => prev.filter(e => e.id !== exercise.id));
        } else {
            setSelectedExercises(prev => [
                ...prev,
                {
                    ...exercise,
                    sets: 3,
                    reps: 5,
                    restTime: exercise.default_rest_seconds || 90,
                    timePerRep: exercise.time_per_rep_seconds || 3
                }
            ]);
        }
    };

    const updateExercise = (id: string, updates: Partial<SelectedExercise>) => {
        setSelectedExercises(prev =>
            prev.map(ex => (ex.id === id ? { ...ex, ...updates } : ex))
        );
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            if (initialData && onUpdate) {
                await onUpdate(initialData.id, name, description, selectedExercises);
            } else if (onCreate) {
                await onCreate(name, description, selectedExercises);
            }
            resetForm();
            onClose();
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar la rutina');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setName('');
        setDescription('');
        setSelectedExercises([]);
        setSearchQuery('');
    };

    const filteredExercises = availableExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.muscle_group.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatRestTime = (seconds: number) => {
        return seconds >= 60 ? `${seconds / 60} min` : `${seconds}s`;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {step === 1 && (initialData ? 'Editar Rutina' : 'Nueva Rutina')}
                        {step === 2 && 'Seleccionar Ejercicios'}
                        {step === 3 && 'Configurar Ejercicios'}
                    </Text>
                    <IconButton
                        icon={<Ionicons name="close" size={24} color={COLORS.textSecondary} />}
                        onPress={onClose}
                        variant="ghost"
                    />
                </View>

                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                    {[1, 2, 3].map(s => (
                        <View
                            key={s}
                            style={[
                                styles.progressDot,
                                s <= step && styles.progressDotActive
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.content}>
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Pecho y Tríceps"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Descripción (Opcional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Objetivo de esta rutina..."
                                    placeholderTextColor={COLORS.textMuted}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </View>
                    )}

                    {/* Step 2: Select Exercises */}
                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="🔍 Buscar ejercicio..."
                                placeholderTextColor={COLORS.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />

                            <ScrollView style={styles.exerciseList}>
                                {filteredExercises.map(exercise => {
                                    const isSelected = selectedExercises.some(e => e.id === exercise.id);
                                    return (
                                        <TouchableOpacity
                                            key={exercise.id}
                                            style={[
                                                styles.exerciseItem,
                                                isSelected && styles.exerciseItemSelected
                                            ]}
                                            onPress={() => toggleExercise(exercise)}
                                        >
                                            <View>
                                                <Text style={[
                                                    styles.exerciseName,
                                                    isSelected && styles.textSelected
                                                ]}>{exercise.name}</Text>
                                                <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={styles.summaryBar}>
                                <Text style={styles.summaryText}>
                                    {selectedExercises.length} ejercicios seleccionados
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Step 3: Configure Exercises */}
                    {step === 3 && (
                        <ScrollView style={styles.stepContainer}>
                            <Text style={styles.configHint}>
                                Configura las series, repeticiones y descanso para cada ejercicio
                            </Text>

                            {selectedExercises.map((exercise, index) => (
                                <View key={exercise.id} style={styles.configCard}>
                                    <View style={styles.configHeader}>
                                        <Text style={styles.configIndex}>{index + 1}</Text>
                                        <View style={styles.configInfo}>
                                            <Text style={styles.configName}>{exercise.name}</Text>
                                            <Text style={styles.configMuscle}>{exercise.muscle_group}</Text>
                                        </View>
                                    </View>

                                    {/* Sets & Reps Row */}
                                    <View style={styles.configRow}>
                                        <View style={styles.configField}>
                                            <Text style={styles.configFieldLabel}>Series</Text>
                                            <View style={styles.stepper}>
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => updateExercise(exercise.id, { sets: Math.max(1, exercise.sets - 1) })}
                                                >
                                                    <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                                                </TouchableOpacity>
                                                <Text style={styles.stepperValue}>{exercise.sets}</Text>
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => updateExercise(exercise.id, { sets: exercise.sets + 1 })}
                                                >
                                                    <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.configField}>
                                            <Text style={styles.configFieldLabel}>Repeticiones</Text>
                                            <View style={styles.stepper}>
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => updateExercise(exercise.id, { reps: Math.max(1, Number(exercise.reps) - 1) })}
                                                >
                                                    <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                                                </TouchableOpacity>
                                                <Text style={styles.stepperValue}>{exercise.reps}</Text>
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => updateExercise(exercise.id, { reps: Number(exercise.reps) + 1 })}
                                                >
                                                    <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Rest Time Chips */}
                                    <View style={styles.restTimeContainer}>
                                        <Text style={styles.configFieldLabel}>
                                            <Ionicons name="timer-outline" size={14} color={COLORS.textSecondary} /> Descanso
                                        </Text>
                                        <View style={styles.restTimeOptions}>
                                            {REST_TIME_OPTIONS.map(time => (
                                                <TouchableOpacity
                                                    key={time}
                                                    style={[
                                                        styles.restTimeChip,
                                                        exercise.restTime === time && styles.restTimeChipActive
                                                    ]}
                                                    onPress={() => updateExercise(exercise.id, { restTime: time })}
                                                >
                                                    <Text style={[
                                                        styles.restTimeChipText,
                                                        exercise.restTime === time && styles.restTimeChipTextActive
                                                    ]}>
                                                        {formatRestTime(time)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Time Per Rep Chips */}
                                    <View style={styles.restTimeContainer}>
                                        <Text style={styles.configFieldLabel}>
                                            <Ionicons name="speedometer-outline" size={14} color={COLORS.textSecondary} /> Tiempo/Rep
                                        </Text>
                                        <View style={styles.restTimeOptions}>
                                            {TIME_PER_REP_OPTIONS.map(time => (
                                                <TouchableOpacity
                                                    key={time}
                                                    style={[
                                                        styles.restTimeChip,
                                                        exercise.timePerRep === time && styles.timePerRepChipActive
                                                    ]}
                                                    onPress={() => updateExercise(exercise.id, { timePerRep: time })}
                                                >
                                                    <Text style={[
                                                        styles.restTimeChipText,
                                                        exercise.timePerRep === time && styles.timePerRepChipTextActive
                                                    ]}>
                                                        {time}s
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <Text style={styles.timePerRepHint}>
                                            {exercise.timePerRep === 2 ? '⚡ Rápido' :
                                                exercise.timePerRep === 3 ? '💪 Normal' :
                                                    exercise.timePerRep === 4 ? '🎯 Controlado' : '🐢 Lento'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {step > 1 && (
                        <Button
                            title="Atrás"
                            variant="secondary"
                            onPress={handleBack}
                            style={{ flex: 1 }}
                        />
                    )}
                    <Button
                        title={step === 3 ? (initialData ? "Guardar Cambios" : "Crear Rutina") : "Siguiente"}
                        variant={step === 3 ? "gradient" : "primary"}
                        onPress={step === 3 ? handleSave : handleNext}
                        loading={loading}
                        style={{ flex: 1 }}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.surfaceHighlight,
    },
    progressDotActive: {
        backgroundColor: COLORS.primary,
        width: 24,
    },
    content: {
        flex: 1,
    },
    stepContainer: {
        flex: 1,
        padding: SPACING.md,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        fontWeight: '600',
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        fontSize: FONT_SIZES.md,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    searchInput: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.full,
        padding: SPACING.md,
        paddingHorizontal: SPACING.lg,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    exerciseList: {
        flex: 1,
    },
    exerciseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        marginBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    exerciseItemSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.surfaceLight,
    },
    exerciseName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    textSelected: {
        color: COLORS.primaryLight,
    },
    exerciseMuscle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    summaryBar: {
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
    },
    summaryText: {
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    configHint: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    configCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    configHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    configIndex: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        color: '#FFF',
        textAlign: 'center',
        lineHeight: 28,
        fontWeight: '700',
        marginRight: SPACING.sm,
    },
    configInfo: {
        flex: 1,
    },
    configName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    configMuscle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    configRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    configField: {
        flex: 1,
    },
    configFieldLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        fontWeight: '600',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    stepperBtn: {
        padding: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    stepperValue: {
        flex: 1,
        textAlign: 'center',
        color: COLORS.textPrimary,
        fontWeight: '700',
        fontSize: FONT_SIZES.lg,
    },
    repsInput: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        fontWeight: '600',
    },
    restTimeContainer: {
        marginTop: SPACING.xs,
    },
    restTimeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginTop: SPACING.xs,
    },
    restTimeChip: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.sm,
    },
    restTimeChipActive: {
        backgroundColor: COLORS.primary,
    },
    restTimeChipText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    restTimeChipTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    timePerRepChipActive: {
        backgroundColor: COLORS.secondary,
    },
    timePerRepChipTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    timePerRepHint: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
        backgroundColor: COLORS.surface,
        paddingBottom: SPACING.xl,
    },
});
