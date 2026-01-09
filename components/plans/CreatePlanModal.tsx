import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Button } from '../ui/Button';
import { Routine, Plan } from '../../lib/database.types';
import { useRoutines } from '../../hooks/useRoutines';
import { PlanWithRoutines } from '../../hooks/usePlans';

interface CreatePlanModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate?: (name: string, description: string | null, durationDays: number, routines: { day: number; routineId: string; notes?: string }[]) => Promise<any>;
    onUpdate?: (id: string, name: string, description: string | null, durationDays: number, routines: { day: number; routineId: string; notes?: string }[]) => Promise<any>;
    initialData?: PlanWithRoutines | null;
}

export function CreatePlanModal({ visible, onClose, onCreate, onUpdate, initialData }: CreatePlanModalProps) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [numDays, setNumDays] = useState(7);
    const [loading, setLoading] = useState(false);

    // Plan Structure: Array of 7 days (1-7)
    // Each day can have an assigned routine
    const [planDays, setPlanDays] = useState<{ day: number; routine: Routine | null; notes: string }[]>(
        Array.from({ length: 7 }, (_, i) => ({ day: i + 1, routine: null, notes: '' }))
    );

    const { routines } = useRoutines(); // To select from
    const [selectedDayForRoutine, setSelectedDayForRoutine] = useState<number | null>(null);

    const resetForm = () => {
        setStep(1);
        setName('');
        setDescription('');
        setNumDays(7);
        setPlanDays(Array.from({ length: 7 }, (_, i) => ({ day: i + 1, routine: null, notes: '' })));
        setSelectedDayForRoutine(null);
    };

    // Initialize with data if editing
    useEffect(() => {
        if (visible && initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');

            // Determine number of days from items
            let maxDay = initialData.duration_days || 7;

            // Fallback for sanity: ensure it covers existing items
            if (initialData.items.length > 0) {
                const maxDayInItems = Math.max(...initialData.items.map(i => i.day_number));
                if (maxDayInItems > maxDay) {
                    maxDay = maxDayInItems;
                }
            }
            setNumDays(maxDay);

            const newDays = Array.from({ length: maxDay }, (_, i) => ({ day: i + 1, routine: null as Routine | null, notes: '' }));

            initialData.items.forEach(item => {
                if (item.day_number >= 1 && item.day_number <= maxDay) {
                    newDays[item.day_number - 1] = {
                        day: item.day_number,
                        routine: item.routine,
                        notes: item.notes || ''
                    };
                }
            });

            setPlanDays(newDays);
        } else if (visible && !initialData) {
            // Reset if opening in create mode
            resetForm();
        }
    }, [visible, initialData]);

    const handleNext = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Por favor ingresa un nombre para el programa');
            return;
        }
        if (numDays < 1) {
            Alert.alert('Error', 'El plan debe tener al menos 1 día');
            return;
        }

        // Resize planDays array while preserving existing data if possibler
        const newDays = Array.from({ length: numDays }, (_, i) => {
            const existingDay = planDays.find(d => d.day === i + 1);
            return existingDay || { day: i + 1, routine: null, notes: '' };
        });

        setPlanDays(newDays);
        setStep(2);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const routinesToSave = planDays
                .filter(d => d.routine !== null)
                .map(d => ({
                    day: d.day,
                    routineId: d.routine!.id,
                    notes: d.notes
                }));

            if (initialData && onUpdate) {
                await onUpdate(initialData.id, name, description || null, numDays, routinesToSave);
            } else if (onCreate) {
                await onCreate(name, description || null, numDays, routinesToSave);
            }

            resetForm();
            onClose();
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar el programa');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRoutine = (routine: Routine) => {
        if (selectedDayForRoutine !== null) {
            setPlanDays(prev => prev.map(day => {
                if (day.day === selectedDayForRoutine) {
                    return { ...day, routine: routine };
                }
                return day;
            }));
            setSelectedDayForRoutine(null);
        }
    };

    const handleRemoveRoutine = (dayNum: number) => {
        setPlanDays(prev => prev.map(day => {
            if (day.day === dayNum) {
                return { ...day, routine: null };
            }
            return day;
        }));
    };

    const renderRoutineSelection = () => {
        if (selectedDayForRoutine === null) return null;

        return (
            <View style={styles.overlay}>
                <View style={styles.selectionModal}>
                    <View style={styles.selectionHeader}>
                        <Text style={styles.selectionTitle}>Seleccionar Rutina - Día {selectedDayForRoutine}</Text>
                        <TouchableOpacity onPress={() => setSelectedDayForRoutine(null)}>
                            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.routinesList}>
                        {routines.map(routine => (
                            <TouchableOpacity
                                key={routine.id}
                                style={styles.routineOption}
                                onPress={() => handleSelectRoutine(routine)}
                            >
                                <Text style={styles.routineOptionName}>{routine.name}</Text>
                                <Text style={styles.routineOptionDuration}>{routine.estimated_duration} min</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContainer}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {initialData ? 'Editar Programa' : 'Nuevo Programa'}
                        </Text>
                        <TouchableOpacity onPress={onClose} disabled={loading}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {step === 1 ? (
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre del Programa</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Ej: Full Body 3 Días"
                                    placeholderTextColor={COLORS.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Cantidad de Días</Text>
                                <TextInput
                                    style={styles.input}
                                    value={numDays.toString()}
                                    onChangeText={(text) => {
                                        const days = parseInt(text) || 0;
                                        setNumDays(days);
                                    }}
                                    placeholder="Ej: 7"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Descripción (Opcional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Objetivo principal, duración..."
                                    placeholderTextColor={COLORS.textMuted}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </View>
                    ) : (
                        <ScrollView style={styles.daysList}>
                            {planDays.map((day) => (
                                <View key={day.day} style={styles.dayRow}>
                                    <View style={styles.dayLabel}>
                                        <Text style={styles.dayNumber}>Día {day.day}</Text>
                                    </View>

                                    <View style={styles.dayContent}>
                                        {day.routine ? (
                                            <View style={styles.assignedRoutine}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.assignedName}>{day.routine.name}</Text>
                                                    <Text style={styles.assignedDuration}>~{day.routine.estimated_duration} min</Text>
                                                </View>
                                                <TouchableOpacity onPress={() => handleRemoveRoutine(day.day)}>
                                                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.addRoutineBtn}
                                                onPress={() => setSelectedDayForRoutine(day.day)}
                                            >
                                                <Ionicons name="add" size={16} color={COLORS.primary} />
                                                <Text style={styles.addRoutineText}>Asignar Rutina</Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Optional: Add notes input for each day later */}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <View style={styles.footer}>
                        {step === 2 && (
                            <Button
                                title="Atrás"
                                onPress={() => setStep(1)}
                                variant="secondary"
                                style={{ flex: 1 }}
                            />
                        )}
                        <Button
                            title={step === 1 ? 'Siguiente' : (loading ? 'Guardando...' : (initialData ? 'Actualizar' : 'Crear'))}
                            onPress={step === 1 ? handleNext : handleSave}
                            variant="primary"
                            style={{ flex: 2 }}
                            disabled={loading}
                        />
                    </View>

                    {selectedDayForRoutine !== null && renderRoutineSelection()}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        height: '90%',
        padding: SPACING.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    form: {
        flex: 1,
        gap: SPACING.lg,
    },
    inputGroup: {
        gap: SPACING.sm,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    footer: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginTop: SPACING.lg,
    },
    daysList: {
        flex: 1,
    },
    dayRow: {
        flexDirection: 'row',
        marginBottom: SPACING.md,
        alignItems: 'center',
        gap: SPACING.md,
    },
    dayLabel: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.sm,
        paddingVertical: SPACING.sm,
    },
    dayNumber: {
        color: COLORS.textSecondary,
        fontWeight: '700',
        fontSize: FONT_SIZES.sm,
    },
    dayContent: {
        flex: 1,
    },
    addRoutineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        borderStyle: 'dashed',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        gap: 8,
    },
    addRoutineText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: FONT_SIZES.sm,
    },
    assignedRoutine: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.success, // Highlight assigned
    },
    assignedName: {
        color: COLORS.textPrimary,
        fontWeight: '600',
        fontSize: FONT_SIZES.sm,
    },
    assignedDuration: {
        color: COLORS.textMuted,
        fontSize: 10,
    },

    // Selection Overlay
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    selectionModal: {
        backgroundColor: COLORS.surface,
        width: '100%',
        maxHeight: '70%',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    selectionTitle: {
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
    routinesList: {

    },
    routineOption: {
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    routineOptionName: {
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    routineOptionDuration: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
});
