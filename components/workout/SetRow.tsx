import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { SetData } from '../../store/workoutStore';

interface SetRowProps {
    set: SetData;
    previousWeight?: number;
    previousReps?: number;
    onUpdate: (data: Partial<SetData>) => void;
    onComplete: () => void;
    onDelete: () => void;
}

export function SetRow({
    set,
    previousWeight,
    previousReps,
    onUpdate,
    onComplete,
    onDelete,
}: SetRowProps) {
    const isImprovement =
        set.isCompleted &&
        previousWeight !== undefined &&
        (set.weight > previousWeight || (set.weight === previousWeight && set.reps > (previousReps || 0)));

    return (
        <View style={[styles.container, set.isCompleted && styles.completedContainer]}>
            {/* Set Number */}
            <View style={styles.setNumberContainer}>
                <Text style={[styles.setNumber, set.isCompleted && styles.completedText]}>
                    {set.isWarmup ? 'W' : set.setNumber}
                </Text>
            </View>

            {/* Previous */}
            <View style={styles.previousContainer}>
                <Text style={styles.previousText}>
                    {previousWeight ? `${previousWeight}kg × ${previousReps}` : '-'}
                </Text>
            </View>

            {/* Weight Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, set.isCompleted && styles.completedInput]}
                    value={set.weight > 0 ? set.weight.toString() : ''}
                    onChangeText={(text) => onUpdate({ weight: parseFloat(text) || 0 })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    editable={!set.isCompleted}
                />
            </View>

            {/* Reps Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, set.isCompleted && styles.completedInput]}
                    value={set.reps > 0 ? set.reps.toString() : ''}
                    onChangeText={(text) => onUpdate({ reps: parseInt(text) || 0 })}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    editable={!set.isCompleted}
                />
            </View>

            {/* Checkbox */}
            <TouchableOpacity
                style={[
                    styles.checkbox,
                    set.isCompleted ? styles.checkboxChecked : styles.checkboxUnchecked
                ]}
                onPress={onComplete}
            >
                {set.isCompleted && (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        marginBottom: 4,
    },
    completedContainer: {
        opacity: 0.8,
    },
    setNumberContainer: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    setNumber: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    previousContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previousText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.sm,
    },
    inputContainer: {
        width: 60,
        paddingHorizontal: 4,
    },
    input: {
        backgroundColor: COLORS.surfaceLight,
        color: COLORS.textPrimary,
        borderRadius: BORDER_RADIUS.sm,
        textAlign: 'center',
        paddingVertical: 8,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    completedInput: {
        backgroundColor: 'transparent',
        color: COLORS.success,
    },
    completedText: {
        color: COLORS.success,
    },
    checkbox: {
        width: 32,
        height: 32,
        borderRadius: BORDER_RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    checkboxUnchecked: {
        backgroundColor: COLORS.surfaceLight,
    },
    checkboxChecked: {
        backgroundColor: COLORS.success,
    },
});
