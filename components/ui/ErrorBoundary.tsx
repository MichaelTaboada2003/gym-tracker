import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Button } from './Button';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
}

/**
 * Catches render-time crashes so a single bad screen shows a recoverable panel
 * instead of a blank white app with no way back.
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
                    <Ionicons name="warning-outline" size={36} color={COLORS.warning} />
                </View>
                <Text style={styles.title}>Algo se rompió</Text>
                <Text style={styles.subtitle}>
                    Tus datos están a salvo. Puedes reintentar sin perder nada.
                </Text>

                <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailContent}>
                    <Text style={styles.detailText}>{error.message}</Text>
                </ScrollView>

                <Button title="Reintentar" onPress={this.reset} variant="gradient" size="lg" fullWidth />
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
        backgroundColor: COLORS.warning + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontFamily: FONTS.display,
        color: COLORS.textPrimary,
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
});
