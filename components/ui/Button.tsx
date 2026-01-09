import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    fullWidth?: boolean;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    style,
    fullWidth = false,
}: ButtonProps) {
    const isGradient = variant === 'primary' || variant === 'gradient';
    const gradientColors = variant === 'gradient'
        ? COLORS.gradients.secondary
        : COLORS.gradients.primary;

    const buttonBaseStyle: ViewStyle = {
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        borderRadius: BORDER_RADIUS.md,
        opacity: disabled ? 0.6 : 1,
        ...style,
    };

    const contentContainerStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: size === 'sm' ? SPACING.sm : size === 'lg' ? SPACING.lg : SPACING.md,
        paddingHorizontal: size === 'sm' ? SPACING.md : size === 'lg' ? SPACING.xl : SPACING.lg,
    };

    const renderContent = () => (
        <>
            {loading ? (
                <ActivityIndicator
                    color={
                        variant === 'ghost' || variant === 'secondary'
                            ? COLORS.primary
                            : COLORS.textPrimary
                    }
                    size="small"
                />
            ) : (
                <>
                    {icon}
                    <Text
                        style={[
                            styles.text,
                            styles[`text_${size}`],
                            styles[`text_${variant}`],
                            isGradient && styles.text_white,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </>
    );

    if (isGradient && !disabled && variant !== 'ghost') {
        return (
            <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.8} style={buttonBaseStyle}>
                <LinearGradient
                    colors={gradientColors as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradientContainer, contentContainerStyle]}
                >
                    {renderContent()}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[
                buttonBaseStyle,
                contentContainerStyle,
                !isGradient && styles[variant],
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {renderContent()}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    gradientContainer: {
        borderRadius: BORDER_RADIUS.md,
        width: '100%',
    },
    // Variants (Solid)
    primary: {
        backgroundColor: COLORS.primary,
    },
    secondary: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: COLORS.error,
    },

    // Text Styles
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
    text_white: {
        color: '#FFFFFF',
    },
    text_primary: {
        color: '#FFFFFF',
    },
    text_gradient: {
        color: '#FFFFFF',
    },
    text_secondary: {
        color: COLORS.textPrimary,
    },
    text_ghost: {
        color: COLORS.primaryLight,
    },
    text_danger: {
        color: '#FFFFFF',
    },

    // Sizes
    text_sm: {
        fontSize: FONT_SIZES.sm,
    },
    text_md: {
        fontSize: FONT_SIZES.md,
    },
    text_lg: {
        fontSize: FONT_SIZES.lg,
    },
});
