import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
}

/**
 * Catches render-time crashes so a single bad screen shows a recoverable panel
 * instead of a blank white app with no way back.
 * Uses only core React Native primitives to avoid crashing inside the fallback itself.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ui] uncaught render error:', error, info.componentStack);
    }

    private reset = () => this.setState({ error: null });

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        return (
            <View style={styles.container}>
                <View style={styles.iconCircle}>
                    <Text style={styles.iconEmoji}>⚠️</Text>
                </View>
                <Text style={styles.title}>Algo no salió como esperábamos</Text>
                <Text style={styles.subtitle}>
                    Tus datos están a salvo. Puedes reintentar sin perder nada.
                </Text>

                <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailContent}>
                    <Text style={styles.detailText}>{error.message || String(error)}</Text>
                </ScrollView>

                <TouchableOpacity style={styles.button} onPress={this.reset} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        gap: SPACING.md,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(234, 179, 8, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconEmoji: {
        fontSize: 32,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    detailBox: {
        maxHeight: 140,
        alignSelf: 'stretch',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    detailContent: {
        padding: SPACING.md,
    },
    detailText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        fontFamily: 'monospace',
    },
    button: {
        alignSelf: 'stretch',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.sm,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
});
