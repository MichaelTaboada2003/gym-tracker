import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/colors';

interface IconButtonProps {
    onPress: () => void;
    icon: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'glass' | 'ghost';
    size?: number;
    style?: ViewStyle;
}

export function IconButton({
    onPress,
    icon,
    variant = 'glass',
    size = 40,
    style,
}: IconButtonProps) {
    const isGradient = variant === 'primary' || variant === 'secondary';
    const gradientColors = variant === 'primary' ? COLORS.gradients.primary : COLORS.gradients.secondary;

    const Container = isGradient ? LinearGradient : TouchableOpacity;
    const containerProps = isGradient
        ? { colors: gradientColors as any, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }
        : {};

    const baseStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle;

    const variantStyles = {
        primary: {},
        secondary: {},
        glass: {
            backgroundColor: COLORS.overlay.medium,
            borderWidth: 1,
            borderColor: COLORS.overlay.light,
        },
        ghost: {
            backgroundColor: 'transparent',
        },
    };

    if (isGradient) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
                <LinearGradient
                    colors={gradientColors as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[baseStyle, variantStyles[variant]]}
                >
                    {icon}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[baseStyle, variantStyles[variant], style]}
        >
            {icon}
        </TouchableOpacity>
    );
}
