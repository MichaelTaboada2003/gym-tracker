import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SetData } from '../../store/workoutStore';
import { formatWeight } from '../../lib/utils';
import { tapLight, tapMedium } from '../../lib/feedback';

interface SetRowProps {
    set: SetData;
    /** Muscle colour, used for the completed state so the row matches its rail. */
    accentColor: string;
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
    accentColor,
}: {
    value: number;
    onCommit: (next: number) => void;
    editable: boolean;
    decimal: boolean;
    accessibilityLabel: string;
    completed: boolean;
    accentColor: string;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const isFocused = useRef(false);
    const [focused, setFocused] = useState(false);

    // Adopt external changes (pre-fill, undo) while the user is not typing.
    useEffect(() => {
        if (!isFocused.current) setDraft(null);
    }, [value]);

    const display = draft ?? (value > 0 ? (decimal ? formatWeight(value) : String(value)) : '');

    return (
        <TextInput
            style={[
                styles.input,
                focused && styles.inputFocused,
                completed && [styles.inputCompleted, { color: accentColor }],
            ]}
            value={display}
            onFocus={() => {
                isFocused.current = true;
                setFocused(true);
            }}
            onBlur={() => {
                isFocused.current = false;
                setFocused(false);
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
            placeholder="—"
            placeholderTextColor={COLORS.textMuted}
            editable={editable}
            accessibilityLabel={accessibilityLabel}
        />
    );
}

/** One ruled line of the set ledger. */
export function SetRow({
    set,
    accentColor,
    previousWeight,
    previousReps,
    onUpdate,
    onToggle,
    onDelete,
}: SetRowProps) {
    const [showRpe, setShowRpe] = useState(false);

    const handleToggle = () => {
        // Completing a set is the app's core gesture; confirm it in the hand.
        if (set.isCompleted) tapLight();
        else tapMedium();
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
        <View style={styles.wrapper}>
            <View style={styles.row}>
                {/* The set number doubles as the row's menu: warmup and delete
                    have nowhere else to live in a five-column grid. */}
                <TouchableOpacity
                    onPress={openSetMenu}
                    style={styles.colSet}
                    accessibilityRole="button"
                    accessibilityLabel={`Opciones de la serie ${set.setNumber}`}
                >
                    <Text
                        style={[
                            styles.setNumber,
                            set.isWarmup && styles.warmupNumber,
                            set.isCompleted && !set.isWarmup && { color: accentColor },
                        ]}
                    >
                        {set.isWarmup ? 'W' : set.setNumber}
                    </Text>
                </TouchableOpacity>

                {/* Last session sits a tone back, so today's numbers read on top of it. */}
                <View style={styles.colPrev}>
                    <Text style={styles.previousText} numberOfLines={1}>
                        {hasPrevious ? `${formatWeight(previousWeight)} × ${previousReps}` : '—'}
                    </Text>
                </View>

                <View style={styles.colInput}>
                    <NumericField
                        value={set.weight}
                        onCommit={(weight) => onUpdate({ weight })}
                        editable={!set.isCompleted}
                        decimal
                        completed={set.isCompleted}
                        accentColor={accentColor}
                        accessibilityLabel={`Peso de la serie ${set.setNumber}`}
                    />
                </View>

                <View style={styles.colInput}>
                    <NumericField
                        value={set.reps}
                        onCommit={(reps) => onUpdate({ reps })}
                        editable={!set.isCompleted}
                        decimal={false}
                        completed={set.isCompleted}
                        accentColor={accentColor}
                        accessibilityLabel={`Repeticiones de la serie ${set.setNumber}`}
                    />
                </View>

                <View style={styles.colCheck}>
                    <Pressable
                        onPress={handleToggle}
                        style={({ pressed }) => [
                            styles.checkbox,
                            set.isCompleted
                                ? { backgroundColor: accentColor, borderColor: accentColor }
                                : styles.checkboxIdle,
                            pressed && styles.checkboxPressed,
                        ]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: set.isCompleted }}
                        accessibilityLabel={`Completar serie ${set.setNumber}`}
                    >
                        {/* Nothing at all when pending: a greyed tick inside an
                            empty box read as "already done, but disabled". */}
                        {set.isCompleted && (
                            <Ionicons name="checkmark" size={18} color={COLORS.onChalk} />
                        )}
                    </Pressable>
                </View>
            </View>

            {set.isCompleted && (
                <View style={styles.rpeRow}>
                    <TouchableOpacity
                        onPress={() => setShowRpe((open) => !open)}
                        style={styles.rpeToggle}
                        accessibilityRole="button"
                        accessibilityLabel="Registrar esfuerzo percibido"
                    >
                        <Text style={[styles.rpeToggleText, set.rpe != null && styles.rpeToggleTextSet]}>
                            {set.rpe ? `RPE ${set.rpe}` : 'RPE'}
                        </Text>
                        <Ionicons
                            name={showRpe ? 'chevron-up' : 'chevron-down'}
                            size={10}
                            color={set.rpe != null ? COLORS.warning : COLORS.textMuted}
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
                                <Text
                                    style={[styles.rpeChipText, set.rpe === value && styles.rpeChipTextActive]}
                                >
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
    wrapper: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    // Column widths mirror the header in ExerciseCard.
    colSet: {
        width: 30,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colPrev: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    colInput: {
        width: 62,
        paddingHorizontal: 3,
    },
    colCheck: {
        width: 44,
        alignItems: 'center',
    },
    setNumber: {
        fontFamily: FONTS.display,
        fontSize: 17,
        color: COLORS.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    warmupNumber: {
        color: COLORS.warning,
        fontSize: 14,
    },
    previousText: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.textMuted,
        fontVariant: ['tabular-nums'],
    },
    input: {
        backgroundColor: COLORS.surfaceLight,
        color: COLORS.textPrimary,
        fontFamily: FONTS.display,
        fontSize: 19,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
        textAlign: 'center',
        paddingVertical: 7,
        fontVariant: ['tabular-nums'],
    },
    inputFocused: {
        borderColor: COLORS.textSecondary,
    },
    /** Once logged, the value is a record rather than a field. */
    inputCompleted: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    checkbox: {
        width: 34,
        height: 34,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxIdle: {
        borderColor: COLORS.surfaceHighlight,
        backgroundColor: 'transparent',
    },
    checkboxPressed: {
        opacity: 0.6,
    },
    rpeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingLeft: 30,
        paddingBottom: 7,
        flexWrap: 'wrap',
    },
    rpeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
    },
    rpeToggleText: {
        fontFamily: FONTS.semibold,
        fontSize: 9,
        letterSpacing: 0.8,
        color: COLORS.textMuted,
    },
    rpeToggleTextSet: {
        color: COLORS.warning,
    },
    rpeChip: {
        minWidth: 26,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
    },
    rpeChipActive: {
        backgroundColor: COLORS.warning,
    },
    rpeChipText: {
        fontFamily: FONTS.semibold,
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    rpeChipTextActive: {
        color: COLORS.onChalk,
    },
});
