import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Button } from '../ui/Button';
import { useWorkoutAnalysis } from '../../hooks/useWorkoutAnalysis';
import { Trend } from '../../lib/ai/prompt';

interface AnalysisPanelProps {
    sessionId: string;
}

/**
 * Trend is the one thing colour encodes here, and there are no muscle rails on
 * this panel to collide with. The glyph carries the same meaning, so the state
 * survives for anyone who cannot separate the hues.
 */
const TRENDS: Record<Trend, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
    up: { icon: 'arrow-up', color: COLORS.success },
    down: { icon: 'arrow-down', color: COLORS.error },
    flat: { icon: 'remove', color: COLORS.textSecondary },
    new: { icon: 'sparkles-outline', color: COLORS.textPrimary },
};

export function AnalysisPanel({ sessionId }: AnalysisPanelProps) {
    const { status, analysis, configured, context, error, model, tokensUsed, generate } =
        useWorkoutAnalysis(sessionId);
    const [showPayload, setShowPayload] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Análisis</Text>
                {status === 'ready' && (
                    <Pressable
                        onPress={generate}
                        style={styles.regenerate}
                        accessibilityRole="button"
                        accessibilityLabel="Volver a analizar"
                    >
                        <Ionicons name="refresh" size={13} color={COLORS.textMuted} />
                        <Text style={styles.regenerateText}>Rehacer</Text>
                    </Pressable>
                )}
            </View>

            {!configured ? (
                <View style={styles.notice}>
                    <Text style={styles.noticeText}>
                        Esta versión de la app se compiló sin el servicio de análisis.
                    </Text>
                </View>
            ) : status === 'loading' ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={COLORS.textSecondary} />
                    <Text style={styles.loadingText}>Comparando con tus sesiones anteriores…</Text>
                </View>
            ) : status === 'error' ? (
                <View style={styles.notice}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Button title="Reintentar" variant="secondary" size="sm" onPress={generate} />
                </View>
            ) : status === 'ready' && analysis ? (
                <>
                    {analysis.summary ? <Text style={styles.summary}>{analysis.summary}</Text> : null}

                    {analysis.verdicts.map((verdict, index) => {
                        const trend = TRENDS[verdict.trend];
                        return (
                            <View key={`${verdict.exercise}-${index}`} style={styles.verdict}>
                                <View style={styles.verdictHeader}>
                                    <Ionicons name={trend.icon} size={15} color={trend.color} />
                                    <Text style={styles.verdictName}>{verdict.exercise}</Text>
                                </View>
                                <Text style={styles.diagnosis}>{verdict.diagnosis}</Text>
                                <View style={styles.actionRow}>
                                    <Text style={styles.actionArrow}>→</Text>
                                    <Text style={styles.action}>{verdict.action}</Text>
                                </View>
                            </View>
                        );
                    })}

                    {/* Nothing parsed into cards — show the reply rather than lose it. */}
                    {analysis.verdicts.length === 0 && !analysis.summary ? (
                        <Text style={styles.summary}>{analysis.raw}</Text>
                    ) : null}

                    {model ? (
                        <Text style={styles.meta}>
                            {model}
                            {tokensUsed ? ` · ${tokensUsed} tokens` : ''}
                        </Text>
                    ) : null}
                </>
            ) : (
                <View style={styles.notice}>
                    <Text style={styles.noticeText}>
                        Compara esta sesión con tu historial y te dice qué subir la próxima vez.
                    </Text>
                    <Button title="Analizar sesión" onPress={generate} size="sm" />
                    {context ? (
                        <Pressable onPress={() => setShowPayload((open) => !open)}>
                            <Text style={styles.meta}>
                                ~{context.estimatedTokens} tokens · {context.exerciseCount} ejercicios ·{' '}
                                {showPayload ? 'ocultar datos' : 'ver datos'}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            )}

            {/* The exact payload, so what leaves the device is never a mystery. */}
            {showPayload && context ? <Text style={styles.payload}>{context.text}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontFamily: FONTS.display,
        fontSize: 18,
        letterSpacing: 0.3,
        color: COLORS.textPrimary,
    },
    regenerate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
    },
    regenerateText: {
        fontFamily: FONTS.medium,
        fontSize: 11,
        color: COLORS.textMuted,
    },
    notice: {
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    noticeText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
        color: COLORS.textSecondary,
    },
    errorText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
        color: COLORS.error,
    },
    loading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    loadingText: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    summary: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        lineHeight: 21,
        color: COLORS.textPrimary,
    },
    verdict: {
        gap: 3,
        paddingTop: SPACING.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.surfaceHighlight,
    },
    verdictHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    verdictName: {
        flex: 1,
        fontFamily: FONTS.semibold,
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: COLORS.textPrimary,
    },
    diagnosis: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.textSecondary,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 2,
    },
    actionArrow: {
        fontFamily: FONTS.regular,
        fontSize: 13,
        color: COLORS.textMuted,
    },
    action: {
        flex: 1,
        fontFamily: FONTS.semibold,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.textPrimary,
    },
    meta: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
    },
    payload: {
        fontFamily: 'monospace',
        fontSize: 10,
        lineHeight: 15,
        color: COLORS.textMuted,
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.sm,
    },
});
