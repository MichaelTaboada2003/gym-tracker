import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { SetData } from '../../store/workoutStore';
import { formatWeight } from '../../lib/utils';

interface SetRowProps {
    set: SetData;
    previousWeight?: number;
    previousReps?: number;
    onUpdate: (data: Partial<SetData>) => void;
    /** Toggles completion — tapping a completed set un-completes it. */
    onToggle: () => void;
    onDelete: () => void;
}

const RPE_OPTIONS = [6, 7, 8, 9, 10];

/**
 * A numeric field that keeps its own text while focused.
 *
 * Binding the input straight to the number broke decimals: typing "72." parsed
 * to 72 and the caret jumped back, so "72.5" could not be entered. The draft is
 * committed on every keystroke but the *displayed* text stays what was typed.
 */
function NumericField({
    value,
    onCommit,
    editable,
    decimal,
    accessibilityLabel,
    completed,
}: {
    value: number;
    onCommit: (next: number) => void;
    editable: boolean;
    decimal: boolean;
    accessibilityLabel: string;
    completed: boolean;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const isFocused = useRef(false);

    // Adopt external changes (pre-fill, undo) while the user is not typing.
    useEffect(() => {
        if (!isFocused.current) setDraft(null);
    }, [value]);

    const display = draft ?? (value > 0 ? (decimal ? formatWeight(value) : String(value)) : '');

    return (
        <TextInput
            style={[styles.input, completed && styles.completedInput]}
            value={display}
            onFocus={() => {
                isFocused.current = true;
            }}
            onBlur={() => {
                isFocused.current = false;
                setDraft(null);
            }}
            onChangeText={(text) => {
                const cleaned = decimal
                    ? text.replace(',', '.').replace(/[^0-9.]/g, '')
                    : text.replace(/[^0-9]/g, '');
                setDraft(cleaned);
                const parsed = decimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
                onCommit(Number.isFinite(parsed) ? parsed : 0);
            }}
            keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
            selectTextOnFocus
            returnKeyType="done"
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
            editable={editable}
            accessibilityLabel={accessibilityLabel}
        />
    );
}

export function SetRow({ set, previousWeight, previousReps, onUpdate, onToggle, onDelete }: SetRowProps) {
    const [showRpe, setShowRpe] = useState(false);

    const handleToggle = () => {
        // Completing a set is the app's core gesture; confirm it in the hand.
        void Haptics.impactAsync(
            set.isCompleted ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
        );
        onToggle();
    };

    const openSetMenu = () => {
        Alert.alert(`Serie ${set.setNumber}`, undefined, [
            {
                text: set.isWarmup ? 'Marcar como serie efectiva' : 'Marcar como calentamiento',
                onPress: () => onUpdate({ isWarmup: !set.isWarmup }),
            },
            { text: 'Eliminar serie', style: 'destructive', onPress: onDelete },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    const hasPrevious = previousWeight !== undefined && previousWeight > 0;

    return (
        <View>
            <View style={[styles.container, set.isCompleted && styles.completedContainer]}>
                {/* Long-press is the only place warmup / delete live, so it gets a hint chevron. */}
                <TouchableOpacity
                    onPress={openSetMenu}
                    onLongPress={openSetMenu}
                    style={styles.setNumberContainer}
                    accessibilityRole="button"
                    accessibilityLabel={`Opciones de la serie ${set.setNumber}`}
                >
                    <Text
                        style={[
                            styles.setNumber,
                            set.isCompleted && styles.completedText,
                            set.isWarmup && styles.warmupText,
                        ]}
                    >
                        {set.isWarmup ? 'W' : set.setNumber}
                    </Text>
                </TouchableOpacity>

                <View style={styles.previousContainer}>
                    <Text style={styles.previousText} numberOfLines={1}>
                        {hasPrevious ? `${formatWeight(previousWeight)}kg × ${previousReps}` : '—'}
                    </Text>
                </View>

                <View style={styles.inputContainer}>
                    <NumericField
                        value={set.weight}
                        onCommit={(weight) => onUpdate({ weight })}
                        editable={!set.isCompleted}
                        decimal
                        completed={set.isCompleted}
                        accessibilityLabel={`Peso de la serie ${set.setNumber}`}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <NumericField
                        value={set.reps}
                        onCommit={(reps) => onUpdate({ reps })}
                        editable={!set.isCompleted}
                        decimal={false}
                        completed={set.isCompleted}
                        accessibilityLabel={`Repeticiones de la serie ${set.setNumber}`}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.checkbox, set.isCompleted ? styles.checkboxChecked : styles.checkboxUnchecked]}
                    onPress={handleToggle}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: set.isCompleted }}
                    accessibilityLabel={`Completar serie ${set.setNumber}`}
                >
                    <Ionicons
                        name="checkmark"
                        size={18}
                        color={set.isCompleted ? '#FFF' : COLORS.textMuted}
                    />
                </TouchableOpacity>
            </View>

            {set.isCompleted && (
                <View style={styles.rpeRow}>
                    <TouchableOpacity
                        onPress={() => setShowRpe((open) => !open)}
                        style={styles.rpeToggle}
                        accessibilityRole="button"
                        accessibilityLabel="Registrar esfuerzo percibido"
                    >
                        <Text style={styles.rpeToggleText}>
                            {set.rpe ? `RPE ${set.rpe}` : 'RPE'}
                        </Text>
                        <Ionicons
                            name={showRpe ? 'chevron-up' : 'chevron-down'}
                            size={11}
                            color={set.rpe ? COLORS.warning : COLORS.textMuted}
                        />
                    </TouchableOpacity>

                    {showRpe &&
                        RPE_OPTIONS.map((value) => (
                            <TouchableOpacity
                                key={value}
                                onPress={() => {
                                    onUpdate({ rpe: set.rpe === value ? null : value });
                                    setShowRpe(false);
                                }}
                                style={[styles.rpeChip, set.rpe === value && styles.rpeChipActive]}
                                accessibilityRole="button"
                                accessibilityLabel={`RPE ${value}`}
                            >
                                <Text style={[styles.rpeChipText, set.rpe === value && styles.rpeChipTextActive]}>
                                    {value}
                                </Text>
                            </TouchableOpacity>
                        ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
    },
    completedContainer: {
        backgroundColor: COLORS.success + '0D',
        borderRadius: BORDER_RADIUS.sm,
    },
    setNumberContainer: {
        width: 34,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    setNumber: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
    },
    completedText: {
        color: COLORS.success,
    },
    warmupText: {
        color: COLORS.warning,
    },
    previousContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    previousText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
    },
    inputContainer: {
        width: 62,
        paddingHorizontal: 3,
    },
    input: {
        backgroundColor: COLORS.surfaceLight,
        color: COLORS.textPrimary,
        borderRadius: BORDER_RADIUS.sm,
        textAlign: 'center',
        paddingVertical: 9,
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
    },
    completedInput: {
        backgroundColor: 'transparent',
        color: COLORS.success,
    },
    checkbox: {
        width: 38,
        height: 38,
        borderRadius: BORDER_RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    checkboxUnchecked: {
        backgroundColor: COLORS.surfaceLight,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    checkboxChecked: {
        backgroundColor: COLORS.success,
    },
    rpeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 34,
        paddingBottom: 6,
        flexWrap: 'wrap',
    },
    rpeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceLight,
    },
    rpeToggleText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    rpeChip: {
        minWidth: 28,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
    },
    rpeChipActive: {
        backgroundColor: COLORS.warning,
    },
    rpeChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    rpeChipTextActive: {
        color: '#0F172A',
    },
});
