import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';

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
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    glass: {
        backgroundColor: COLORS.surfaceLight, // Fallback / Base
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        // Note: Real glassmorphism on RN usually requires Expo BlurView
        // mimicking it with semi-transparent styles for now
    },
    gradient: {
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    textWhite: {
        color: '#FFFFFF',
    },
});
