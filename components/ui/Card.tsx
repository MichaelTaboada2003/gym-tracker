import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { FONTS } from '../../constants/typography';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    style?: ViewStyle;
    variant?: 'default' | 'glass' | 'gradient' | 'outlined';
}

export function Card({
    children,
    title,
    style,
    variant = 'default',
    onPress,
}: CardProps & { onPress?: () => void }) {
    const cardContent = (
        <>
            {title && (
                <Text style={[styles.title, variant === 'gradient' && styles.textWhite]}>
                    {title}
                </Text>
            )}
            {children}
        </>
    );

    if (variant === 'gradient') {
        const gradient = (
            <LinearGradient
                colors={COLORS.gradients.dark}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, styles.gradient, style]}
            >
                {cardContent}
            </LinearGradient>
        );

        if (onPress) {
            return (
                <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
                    {gradient}
                </TouchableOpacity>
            );
        }
        return gradient;
    }

    const Container = onPress ? TouchableOpacity : View;
    const containerProps = onPress ? { onPress, activeOpacity: 0.8 } : {};

    if (variant === 'glass') {
        return (
            <Container style={[styles.card, styles.glass, style]} {...containerProps}>
                {cardContent}
            </Container>
        );
    }

    return (
        <Container
            style={[
                styles.card,
                variant === 'outlined' ? styles.outlined : styles.default,
                style,
            ]}
            {...containerProps}
        >
            {cardContent}
        </Container>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        overflow: 'hidden',
    },
    default: {
        backgroundColor: COLORS.surface,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.surfaceHighlight,
    },
    glass: {
        backgroundColor: COLORS.surfaceLight,
    },
    gradient: {
        backgroundColor: COLORS.surface,
    },
    title: {
        fontFamily: FONTS.display,
        fontSize: 18,
        letterSpacing: 0.3,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    textWhite: {
        color: COLORS.textPrimary,
    },
});
