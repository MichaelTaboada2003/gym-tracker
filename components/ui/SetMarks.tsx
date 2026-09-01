import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

interface SetMarksProps {
    total: number;
    completed: number;
    /** Muscle colour for filled marks. Defaults to chalk. */
    color?: string;
    size?: 'sm' | 'md';
    style?: ViewStyle;
    /** Screen-reader summary, e.g. "3 de 4 series completadas". */
    accessibilityLabel?: string;
}

const SIZES = {
    sm: { width: 17, height: 6 },
    md: { width: 24, height: 8 },
} as const;

/** Marks past this count would turn into a dotted line; show a tally instead. */
const MAX_MARKS = 12;

/**
 * Progress as a row of discrete marks — one per set.
 *
 * A percentage bar is a small lie here: sets are countable, and "three of four"
 * is the number a lifter is actually tracking, not "75%". Each mark fills in the
 * muscle's plate colour as its set is completed.
 */
export function SetMarks({
    total,
    completed,
    color = COLORS.textPrimary,
    size = 'sm',
    style,
    accessibilityLabel,
}: SetMarksProps) {
    if (total <= 0) return null;

    const dimensions = SIZES[size];
    const shown = Math.min(total, MAX_MARKS);

    return (
        <View
            style={[styles.row, style]}
            accessibilityRole="progressbar"
            accessibilityLabel={accessibilityLabel ?? `${completed} de ${total} series completadas`}
        >
            {Array.from({ length: shown }, (_, index) => (
                <Mark
                    key={index}
                    filled={index < completed}
                    color={color}
                    width={dimensions.width}
                    height={dimensions.height}
                />
            ))}
        </View>
    );
}

function Mark({
    filled,
    color,
    width,
    height,
}: {
    filled: boolean;
    color: string;
    width: number;
    height: number;
}) {
    const progress = useSharedValue(filled ? 1 : 0);

    useEffect(() => {
        // `ReduceMotion.System` makes this resolve instantly when the OS setting
        // is on, so the mark still fills — it just does not animate.
        progress.value = withTiming(filled ? 1 : 0, {
            duration: 220,
            reduceMotion: ReduceMotion.System,
        });
    }, [filled, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        // Grows from the base, the way a stack loads upward.
        transform: [{ scaleY: 0.35 + progress.value * 0.65 }],
    }));

    return (
        <View style={[styles.mark, { width, height }]}>
            <Animated.View style={[styles.fill, { backgroundColor: color }, animatedStyle]} />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    mark: {
        borderRadius: 2,
        // Hollow socket, so a pending set reads as "still to load".
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.surfaceHighlight,
        backgroundColor: COLORS.surfaceLight,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    fill: {
        width: '100%',
        height: '100%',
        borderRadius: 2,
    },
});
