import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor } from '../../constants/colors';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useExerciseHistory } from '../../hooks/useExerciseHistory';
import { formatRelativeDate, formatSeconds, formatVolume, formatWeight, parseISODate } from '../../lib/utils';

const { width } = Dimensions.get('window');

export default function ExerciseDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { exercise, sessions, summary, loading } = useExerciseHistory(id);

    const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/exercises'));

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!exercise) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Ejercicio" onBack={goBack} />
                <View style={styles.content}>
                    <EmptyState
                        icon="alert-circle-outline"
                        title="Ejercicio no encontrado"
                        message="Puede que se haya eliminado del catálogo."
                        actionLabel="Volver"
                        onAction={goBack}
                    />
                </View>
            </View>
        );
    }

    const color = getMuscleColor(exercise.muscle_group);

    // Only chart once there are at least two points — a single dot says nothing.
    const chartData = summary.progression.slice(-12).map((point) => ({
        value: Math.round(point.value),
        label: parseISODate(point.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    }));

    return (
        <View style={styles.container}>
            <ScreenHeader eyebrow={exercise.muscle_group} title={exercise.name} onBack={goBack} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.metaRow}>
                    {exercise.equipment ? <MetaPill icon="build-outline" text={exercise.equipment} /> : null}
                    <MetaPill icon="hourglass-outline" text={formatSeconds(exercise.default_rest_seconds)} />
                    <MetaPill icon="speedometer-outline" text={`${exercise.time_per_rep_seconds}s / rep`} />
                </View>

                {exercise.notes ? (
                    <View style={styles.notesCard}>
                        <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
                        <Text style={styles.notesText}>{exercise.notes}</Text>
                    </View>
                ) : null}

                {sessions.length === 0 ? (
                    <EmptyState
                        icon="stats-chart-outline"
                        title="Sin registros todavía"
                        message="Cuando entrenes este ejercicio verás aquí tus marcas y tu progresión."
                        actionLabel="Empezar entrenamiento"
                        onAction={() => router.navigate('/workout')}
                    />
                ) : (
                    <>
                        <View style={styles.recordsRow}>
                            <RecordCard
                                icon="barbell"
                                tint={COLORS.warning}
                                value={summary.heaviest ? `${formatWeight(summary.heaviest.weight)} kg` : '—'}
                                label="Peso máximo"
                                caption={
                                    summary.heaviest
                                        ? `× ${summary.heaviest.reps} · ${formatRelativeDate(summary.heaviest.date)}`
                                        : undefined
                                }
                            />
                            <RecordCard
                                icon="trophy"
                                tint={COLORS.success}
                                value={summary.best1RM ? `${Math.round(summary.best1RM.estimated1RM)} kg` : '—'}
                                label="1RM estimado"
                                caption={
                                    summary.best1RM
                                        ? `${formatWeight(summary.best1RM.weight)}kg × ${summary.best1RM.reps}`
                                        : undefined
                                }
                            />
                        </View>

                        <View style={styles.summaryStrip}>
                            <SummaryItem value={String(summary.totalSessions)} label="sesiones" />
                            <View style={styles.summaryDivider} />
                            <SummaryItem value={String(summary.totalSets)} label="series" />
                            <View style={styles.summaryDivider} />
                            <SummaryItem value={formatVolume(summary.totalVolume)} label="volumen" />
                        </View>

                        {chartData.length >= 2 && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Progresión de 1RM estimado</Text>
                                <LineChart
                                    data={chartData}
                                    width={width - SPACING.lg * 2 - SPACING.md * 2 - 40}
                                    height={160}
                                    color={color}
                                    thickness={2.5}
                                    dataPointsColor={color}
                                    startFillColor={color}
                                    endFillColor={COLORS.surface}
                                    startOpacity={0.25}
                                    endOpacity={0}
                                    areaChart
                                    curved
                                    hideRules
                                    yAxisColor="transparent"
                                    xAxisColor={COLORS.surfaceHighlight}
                                    yAxisTextStyle={styles.axisText}
                                    xAxisLabelTextStyle={styles.axisText}
                                    initialSpacing={12}
                                    adjustToWidth
                                />
                            </View>
                        )}

                        <Text style={styles.sectionLabel}>Historial</Text>
                        {sessions.map((session) => (
                            <View key={session.sessionId} style={styles.card}>
                                <View style={styles.sessionHeader}>
                                    <Text style={styles.sessionDate}>{formatRelativeDate(session.date)}</Text>
                                    <Text style={styles.sessionVolume}>{formatVolume(session.volume)}</Text>
                                </View>
                                <View style={styles.setsGrid}>
                                    {session.sets.map((set) => (
                                        <View key={set.logId} style={styles.setPill}>
                                            <Text style={styles.setPillText}>
                                                {formatWeight(set.weight)} × {set.reps}
                                            </Text>
                                            {set.rpe ? <Text style={styles.setPillRpe}>@{set.rpe}</Text> : null}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function MetaPill({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
    return (
        <View style={styles.metaPill}>
            <Ionicons name={icon} size={13} color={COLORS.textMuted} />
            <Text style={styles.metaPillText}>{text}</Text>
        </View>
    );
}

function RecordCard({
    icon,
    tint,
    value,
    label,
    caption,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    tint: string;
    value: string;
    label: string;
    caption?: string;
}) {
    return (
        <View style={[styles.recordCard, { borderColor: tint + '35' }]}>
            <Ionicons name={icon} size={20} color={tint} />
            <Text style={styles.recordValue}>{value}</Text>
            <Text style={styles.recordLabel}>{label}</Text>
            {caption ? <Text style={styles.recordCaption}>{caption}</Text> : null}
        </View>
    );
}

function SummaryItem({ value, label }: { value: string; label: string }) {
    return (
        <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{value}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xxl,
        gap: SPACING.md,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    metaPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    notesCard: {
        flexDirection: 'row',
        gap: SPACING.sm,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.info + '12',
    },
    notesText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 19,
    },
    recordsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    recordCard: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
    },
    recordValue: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    recordLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    recordCaption: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
    summaryStrip: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        paddingVertical: SPACING.md,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryDivider: {
        width: 1,
        backgroundColor: COLORS.surfaceHighlight,
        marginVertical: 4,
    },
    summaryValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    summaryLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: 2,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    cardTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    axisText: {
        color: COLORS.textMuted,
        fontSize: 9,
    },
    sectionLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: SPACING.sm,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionDate: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textTransform: 'capitalize',
    },
    sessionVolume: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    setsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    setPill: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 3,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
    },
    setPillText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    setPillRpe: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.warning,
    },
});
