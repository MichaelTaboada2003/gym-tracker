import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Modal,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { GradientText } from '../../components/ui/GradientText';
import { useExercises } from '../../hooks/useExercises';
import { Exercise } from '../../lib/database.types';

const MUSCLE_GROUPS = [
    'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
    'Piernas', 'Glúteos', 'Core', 'Cardio'
];

const EQUIPMENT_OPTIONS = [
    'Barra', 'Mancuernas', 'Máquina', 'Cable', 'Peso corporal', 'Otro'
];

export default function ExercisesScreen() {
    const { exercises, loading, createExercise, updateExercise, deleteExercise, fetchExercises } = useExercises();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

    // Edit mode
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [muscleGroup, setMuscleGroup] = useState('');
    const [equipment, setEquipment] = useState('');
    const [notes, setNotes] = useState('');

    const filteredExercises = exercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMuscle = !selectedMuscle || ex.muscle_group === selectedMuscle;
        return matchesSearch && matchesMuscle;
    });

    const handleCreateExercise = async () => {
        if (!name.trim() || !muscleGroup) {
            if (typeof window !== 'undefined') {
                window.alert('Nombre y grupo muscular son requeridos');
            }
            return;
        }

        try {
            await createExercise({
                name: name.trim(),
                muscle_group: muscleGroup,
                equipment: equipment || undefined,
                notes: notes || undefined,
            } as any);
            resetForm();
            setIsModalVisible(false);
        } catch (error) {
            console.error('Error creating exercise:', error);
        }
    };

    const handleUpdateExercise = async () => {
        if (!editingExercise) return;
        if (!name.trim() || !muscleGroup) {
            if (typeof window !== 'undefined') {
                window.alert('Nombre y grupo muscular son requeridos');
            }
            return;
        }

        try {
            await updateExercise(editingExercise.id, {
                name: name.trim(),
                muscle_group: muscleGroup,
                equipment: equipment || null,
                notes: notes || null,
            });
            resetForm();
            setIsModalVisible(false);
            setEditingExercise(null);
        } catch (error) {
            console.error('Error updating exercise:', error);
        }
    };

    const handleDeleteExercise = async (exercise: Exercise) => {
        if (typeof window !== 'undefined') {
            const confirmed = window.confirm(`¿Eliminar "${exercise.name}"?`);
            if (!confirmed) return;
        }

        try {
            await deleteExercise(exercise.id);
        } catch (error) {
            console.error('Error deleting exercise:', error);
        }
    };

    const openEditModal = (exercise: Exercise) => {
        setEditingExercise(exercise);
        setName(exercise.name);
        setMuscleGroup(exercise.muscle_group);
        setEquipment(exercise.equipment || '');
        setNotes(exercise.notes || '');
        setIsModalVisible(true);
    };

    const openCreateModal = () => {
        resetForm();
        setEditingExercise(null);
        setIsModalVisible(true);
    };

    const resetForm = () => {
        setName('');
        setMuscleGroup('');
        setEquipment('');
        setNotes('');
    };

    const getMuscleColor = (muscle: string) => {
        const colors: Record<string, string> = {
            'Pecho': COLORS.chest,
            'Espalda': COLORS.back,
            'Hombros': COLORS.shoulders,
            'Bíceps': COLORS.arms,
            'Tríceps': COLORS.arms,
            'Piernas': COLORS.legs,
            'Glúteos': COLORS.legs,
            'Core': COLORS.core,
            'Cardio': COLORS.cardio,
        };
        return colors[muscle] || COLORS.primary;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <GradientText style={styles.headerTitle} colors={COLORS.gradients.primary}>
                    Ejercicios
                </GradientText>
                <IconButton
                    icon={<Ionicons name="add" size={24} color="#FFF" />}
                    variant="primary"
                    onPress={openCreateModal}
                />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar ejercicio..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Muscle Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                <TouchableOpacity
                    style={[styles.filterChip, !selectedMuscle && styles.filterChipActive]}
                    onPress={() => setSelectedMuscle(null)}
                >
                    <Text style={[styles.filterText, !selectedMuscle && styles.filterTextActive]}>
                        Todos
                    </Text>
                </TouchableOpacity>
                {MUSCLE_GROUPS.map(muscle => (
                    <TouchableOpacity
                        key={muscle}
                        style={[
                            styles.filterChip,
                            selectedMuscle === muscle && styles.filterChipActive,
                            selectedMuscle === muscle && { backgroundColor: getMuscleColor(muscle) }
                        ]}
                        onPress={() => setSelectedMuscle(selectedMuscle === muscle ? null : muscle)}
                    >
                        <Text style={[
                            styles.filterText,
                            selectedMuscle === muscle && styles.filterTextActive
                        ]}>
                            {muscle}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Exercise List */}
            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchExercises} tintColor={COLORS.primary} />
                }
            >
                {filteredExercises.length === 0 ? (
                    <Card variant="glass" style={styles.emptyCard}>
                        <View style={styles.emptyState}>
                            <Ionicons name="barbell-outline" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>
                                {searchQuery || selectedMuscle ? 'No hay ejercicios que coincidan' : 'No hay ejercicios aún'}
                            </Text>
                            <Button
                                title="Añadir Ejercicio"
                                variant="secondary"
                                size="sm"
                                onPress={openCreateModal}
                            />
                        </View>
                    </Card>
                ) : (
                    filteredExercises.map(exercise => (
                        <View key={exercise.id} style={styles.exerciseCard}>
                            <View style={[styles.muscleIndicator, { backgroundColor: getMuscleColor(exercise.muscle_group) }]} />
                            <TouchableOpacity
                                style={styles.exerciseInfo}
                                onPress={() => openEditModal(exercise)}
                            >
                                <Text style={styles.exerciseName}>{exercise.name}</Text>
                                <View style={styles.exerciseMeta}>
                                    <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
                                    {exercise.equipment && (
                                        <>
                                            <Text style={styles.metaDot}>•</Text>
                                            <Text style={styles.exerciseEquipment}>{exercise.equipment}</Text>
                                        </>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <View style={styles.exerciseActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => openEditModal(exercise)}
                                >
                                    <Ionicons name="pencil" size={18} color={COLORS.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleDeleteExercise(exercise)}
                                >
                                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Create/Edit Exercise Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setIsModalVisible(false);
                    setEditingExercise(null);
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                        </Text>
                        <IconButton
                            icon={<Ionicons name="close" size={24} color={COLORS.textSecondary} />}
                            variant="ghost"
                            onPress={() => {
                                setIsModalVisible(false);
                                setEditingExercise(null);
                            }}
                        />
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Press de banca inclinado"
                                placeholderTextColor={COLORS.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Muscle Group Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Grupo Muscular *</Text>
                            <View style={styles.optionsGrid}>
                                {MUSCLE_GROUPS.map(muscle => (
                                    <TouchableOpacity
                                        key={muscle}
                                        style={[
                                            styles.optionChip,
                                            muscleGroup === muscle && styles.optionChipActive,
                                            muscleGroup === muscle && { borderColor: getMuscleColor(muscle) }
                                        ]}
                                        onPress={() => setMuscleGroup(muscle)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            muscleGroup === muscle && { color: getMuscleColor(muscle) }
                                        ]}>
                                            {muscle}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Equipment Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Equipamiento</Text>
                            <View style={styles.optionsGrid}>
                                {EQUIPMENT_OPTIONS.map(eq => (
                                    <TouchableOpacity
                                        key={eq}
                                        style={[
                                            styles.optionChip,
                                            equipment === eq && styles.optionChipActive
                                        ]}
                                        onPress={() => setEquipment(equipment === eq ? '' : eq)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            equipment === eq && styles.optionTextActive
                                        ]}>
                                            {eq}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Notas (opcional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Indicaciones sobre técnica, variantes, etc."
                                placeholderTextColor={COLORS.textMuted}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        {editingExercise && (
                            <Button
                                title="Eliminar"
                                variant="secondary"
                                onPress={() => {
                                    handleDeleteExercise(editingExercise);
                                    setIsModalVisible(false);
                                    setEditingExercise(null);
                                }}
                                style={{ marginBottom: SPACING.sm, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                icon={<Ionicons name="trash-outline" size={18} color={COLORS.error} />}
                            />
                        )}
                        <Button
                            title={editingExercise ? 'Guardar Cambios' : 'Crear Ejercicio'}
                            variant="gradient"
                            onPress={editingExercise ? handleUpdateExercise : handleCreateExercise}
                            fullWidth
                        />
                    </View>
                </View>
            </Modal>
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        marginHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.md,
    },
    searchIcon: {
        marginRight: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.sm,
        fontSize: FONT_SIZES.md,
    },
    filterContainer: {
        maxHeight: 44,
        marginBottom: SPACING.md,
    },
    filterContent: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    filterChip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        marginRight: SPACING.sm,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
    },
    filterText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#FFF',
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 100,
    },
    emptyCard: {
        minHeight: 180,
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        gap: SPACING.sm,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
        marginBottom: SPACING.sm,
    },
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    muscleIndicator: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginRight: SPACING.md,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    exerciseMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exerciseMuscle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    metaDot: {
        color: COLORS.textMuted,
        marginHorizontal: 6,
    },
    exerciseEquipment: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },
    exerciseActions: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    actionButton: {
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    modalContent: {
        flex: 1,
        padding: SPACING.lg,
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
        height: 80,
        textAlignVertical: 'top',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    optionChip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    optionChipActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.surfaceLight,
    },
    optionText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    optionTextActive: {
        color: COLORS.primary,
    },
    modalFooter: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceHighlight,
    },
});
