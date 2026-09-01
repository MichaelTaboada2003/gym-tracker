import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useBodyWeight, DateRange } from '../../hooks/useBodyWeight';
import { parseISODate } from '../../lib/utils';
import { showAlert, showConfirm } from '../../lib/dialog';

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
    { key: '7d', label: '7D' },
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '1y', label: '1A' },
    { key: 'all', label: 'Todo' },
];

export const BodyWeightWidget = () => {
    const {
        weightLogs,
        currentWeight,
        addWeightLog,
        deleteWeightLog,
        getLogsForRange,
        getStatsForRange,
        fetchWeightLogs,
    } = useBodyWeight();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [selectedRange, setSelectedRange] = useState<DateRange>('7d');
    const [detailRange, setDetailRange] = useState<DateRange>('1m');

    // Get logs for the widget (last 7 entries for mini chart)
    const widgetChartData = useMemo(() => {
        const logs = getLogsForRange('7d');
        return [...logs]
            .reverse() // Chronological order (oldest first)
            .map((log) => {
                const date = parseISODate(log.date);
                return {
                    value: log.weight_kg,
                    label: `${date.getDate()}/${date.getMonth() + 1}`,
                    dataPointText: '',
                };
            });
    }, [getLogsForRange]);

    // Get logs for detail modal
    const detailChartData = useMemo(() => {
        const logs = getLogsForRange(detailRange);
        return [...logs]
            .reverse()
            .map((log) => {
                const date = parseISODate(log.date);
                const isMonthStart = date.getDate() === 1 || logs.length <= 10;
                return {
                    value: log.weight_kg,
                    label: isMonthStart ? `${date.getDate()}/${date.getMonth() + 1}` : '',
                    dataPointText: '',
                    date: log.date,
                };
            });
    }, [getLogsForRange, detailRange]);

    /** Sparkline frame: pad the real range so the line uses the box's height. */
    const widgetChartRange = useMemo(() => {
        const values = widgetChartData.map((d) => d.value);
        if (values.length === 0) return { offset: 0, max: 1 };
        const min = Math.min(...values);
        const max = Math.max(...values);
        const pad = Math.max(0.5, (max - min) * 0.35);
        return { offset: Math.floor(min - pad), max: Math.ceil(max + pad) };
    }, [widgetChartData]);

    // Calculate trend (from stats)
    const stats = useMemo(() => getStatsForRange('7d'), [getStatsForRange]);
    const detailStats = useMemo(() => getStatsForRange(detailRange), [getStatsForRange, detailRange]);

    const handleAddWeight = async () => {
        const weight = parseFloat(newWeight.replace(',', '.'));
        if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
            showAlert('Peso no válido', 'Introduce un peso entre 1 y 500 kg.');
            return;
        }

        const saved = await addWeightLog(weight);
        if (!saved) {
            showAlert('Error', 'No se pudo guardar el peso.');
            return;
        }
        setNewWeight('');
        setIsModalVisible(false);
    };

    /** Long-press on a history row: the only way to correct a mistyped entry. */
    const confirmDelete = (id: string, label: string) => {
        showConfirm({
            title: 'Eliminar registro',
            message: `¿Borrar el peso de ${label}?`,
            confirmLabel: 'Eliminar',
            onConfirm: () => deleteWeightLog(id),
        });
    };

    const formatChange = (change: number) => {
        const sign = change > 0 ? '+' : '';
        return `${sign}${change.toFixed(1)} kg`;
    };

    return (
        <View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setIsDetailModalVisible(true)}>
                <Card title="Peso corporal">
                    <View style={styles.container}>
                        <View style={styles.statsContainer}>
                            <View>
                                <Text style={styles.currentWeightLabel}>Actual</Text>
                                <View style={styles.weightValueRow}>
                                    <Text style={styles.currentWeight}>
                                        {currentWeight ? currentWeight.toFixed(1) : '--'}
                                    </Text>
                                    <Text style={styles.unit}>kg</Text>
                                </View>
                                {stats.change !== 0 && (
                                    <View style={[
                                        styles.trendContainer,
                                        { backgroundColor: COLORS.surfaceLight }
                                    ]}>
                                        <Ionicons
                                            name={stats.change > 0 ? "caret-up" : "caret-down"}
                                            size={12}
                                            color={COLORS.textSecondary}
                                        />
                                        <Text style={[
                                            styles.trendText,
                                            { color: COLORS.textSecondary }
                                        ]}>
                                            {Math.abs(stats.change).toFixed(1)} kg
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.chartWrapper}>
                                {widgetChartData.length > 1 ? (
                                    <LineChart
                                        data={widgetChartData}
                                        height={60}
                                        width={160}
                                        hideRules
                                        hideAxesAndRules
                                        hideDataPoints={false}
                                        dataPointsColor={COLORS.primary}
                                        dataPointsRadius={3}
                                        color={COLORS.primary}
                                        thickness={2}
                                        curved
                                        isAnimated
                                        animationDuration={500}
                                        initialSpacing={5}
                                        endSpacing={5}
                                        areaChart
                                        startFillColor={COLORS.primary}
                                        endFillColor={COLORS.surface}
                                        startOpacity={0.18}
                                        endOpacity={0}
                                        xAxisLabelsHeight={0}
                                        yAxisOffset={widgetChartRange.offset}
                                        maxValue={widgetChartRange.max - widgetChartRange.offset}
                                        adjustToWidth
                                    />
                                ) : (
                                    <View style={styles.emptyChart}>
                                        <Text style={styles.emptyChartText}>Registra datos</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.actionRow}>
                            <Button
                                title="Registrar peso"
                                variant="secondary"
                                size="sm"
                                icon={<Ionicons name="add" size={16} color={COLORS.textPrimary} />}
                                onPress={() => setIsModalVisible(true)}
                                style={styles.addButton}
                            />
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={() => setIsDetailModalVisible(true)}
                            >
                                <Ionicons name="expand-outline" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>

            {/* Add Weight Modal */}
            <Modal
                visible={isModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Registrar peso</Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="0.0"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="decimal-pad"
                                value={newWeight}
                                onChangeText={setNewWeight}
                                autoFocus
                            />
                            <Text style={styles.inputUnit}>kg</Text>
                        </View>

                        <Text style={styles.modalHint}>
                            Si ya registraste un peso hoy, este se actualizará.
                        </Text>

                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancelar"
                                variant="ghost"
                                onPress={() => setIsModalVisible(false)}
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Guardar"
                                variant="gradient"
                                onPress={handleAddWeight}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Detail View Modal */}
            <Modal
                visible={isDetailModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsDetailModalVisible(false)}
            >
                <View style={styles.detailModalOverlay}>
                    <View style={styles.detailModalContent}>
                        {/* Header */}
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailTitle}>Historial de Peso</Text>
                            <TouchableOpacity
                                onPress={() => setIsDetailModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Date Range Selector */}
                        <View style={styles.rangeSelector}>
                            {DATE_RANGE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.rangeButton,
                                        detailRange === option.key && styles.rangeButtonActive
                                    ]}
                                    onPress={() => setDetailRange(option.key)}
                                >
                                    <Text style={[
                                        styles.rangeButtonText,
                                        detailRange === option.key && styles.rangeButtonTextActive
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Stats Summary */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statBoxLabel}>Actual</Text>
                                <Text style={styles.statBoxValue}>
                                    {detailStats.current?.toFixed(1) ?? '--'} kg
                                </Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statBoxLabel}>Cambio</Text>
                                <Text style={[
                                    styles.statBoxValue,
                                    { color: COLORS.textSecondary }
                                ]}>
                                    {formatChange(detailStats.change)}
                                </Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statBoxLabel}>Mínimo</Text>
                                <Text style={styles.statBoxValue}>
                                    {detailStats.min?.toFixed(1) ?? '--'} kg
                                </Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statBoxLabel}>Máximo</Text>
                                <Text style={styles.statBoxValue}>
                                    {detailStats.max?.toFixed(1) ?? '--'} kg
                                </Text>
                            </View>
                        </View>

                        {/* Chart */}
                        <View style={styles.detailChartContainer}>
                            {detailChartData.length > 1 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <LineChart
                                        data={detailChartData}
                                        height={180}
                                        width={Math.max(300, detailChartData.length * 40)}
                                        hideRules={false}
                                        rulesColor={COLORS.surfaceHighlight}
                                        rulesType="solid"
                                        hideDataPoints={false}
                                        dataPointsColor={COLORS.primary}
                                        dataPointsRadius={4}
                                        color={COLORS.primary}
                                        thickness={2.5}
                                        curved
                                        isAnimated
                                        animationDuration={600}
                                        initialSpacing={20}
                                        endSpacing={20}
                                        areaChart
                                        startFillColor={COLORS.primary + '50'}
                                        endFillColor={COLORS.primary + '05'}
                                        startOpacity={0.5}
                                        endOpacity={0}
                                        yAxisTextStyle={styles.chartAxisText}
                                        xAxisLabelTextStyle={styles.chartAxisText}
                                        yAxisColor={COLORS.surfaceHighlight}
                                        xAxisColor={COLORS.surfaceHighlight}
                                        noOfSections={4}
                                        showVerticalLines
                                        verticalLinesColor={COLORS.surfaceHighlight + '50'}
                                    />
                                </ScrollView>
                            ) : (
                                <View style={styles.emptyDetailChart}>
                                    <Ionicons name="analytics-outline" size={48} color={COLORS.textMuted} />
                                    <Text style={styles.emptyDetailText}>
                                        No hay suficientes datos para este período
                                    </Text>
                                    <Text style={styles.emptyDetailSubtext}>
                                        Registra tu peso regularmente para ver tu progreso
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Weight History List */}
                        <Text style={styles.historyTitle}>
                            Registros recientes <Text style={styles.historyHint}>· mantén pulsado para borrar</Text>
                        </Text>
                        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                            {getLogsForRange(detailRange).slice(0, 10).map((log, index) => {
                                const date = parseISODate(log.date);
                                const dateStr = date.toLocaleDateString('es-ES', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                });
                                return (
                                    <TouchableOpacity
                                        key={log.id}
                                        style={styles.historyItem}
                                        onLongPress={() => confirmDelete(log.id, dateStr)}
                                        accessibilityLabel={`${dateStr}: ${log.weight_kg} kg. Mantén pulsado para eliminar.`}
                                    >
                                        <Text style={styles.historyDate}>{dateStr}</Text>
                                        <Text style={styles.historyWeight}>{log.weight_kg.toFixed(1)} kg</Text>
                                    </TouchableOpacity>
                                );
                            })}
                            {getLogsForRange(detailRange).length === 0 && (
                                <Text style={styles.noHistoryText}>Sin registros en este período</Text>
                            )}
                        </ScrollView>

                        {/* Add Weight Button */}
                        <Button
                            title="Registrar Nuevo Peso"
                            variant="gradient"
                            icon={<Ionicons name="add" size={20} color={COLORS.textPrimary} />}
                            onPress={() => {
                                setIsDetailModalVisible(false);
                                setTimeout(() => setIsModalVisible(true), 300);
                            }}
                            style={styles.detailAddButton}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    chartAxisText: {
        fontFamily: FONTS.medium,
        color: COLORS.textMuted,
        fontSize: 10,
    },
    container: {
        gap: SPACING.md,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currentWeightLabel: {
        fontFamily: FONTS.medium,
        fontSize: 9,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
    },
    weightValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    currentWeight: {
        fontFamily: FONTS.display,
        fontSize: 40,
        lineHeight: 42,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    unit: {
        fontFamily: FONTS.medium,
        fontSize: 13,
        color: COLORS.textMuted,
        marginLeft: 3,
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        gap: 2,
        marginTop: 4,
    },
    trendText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
    },
    chartWrapper: {
        height: 70,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginLeft: -SPACING.sm,
    },
    emptyChart: {
        width: 120,
        height: 60,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyChartText: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    addButton: {
        flex: 1,
    },
    expandButton: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    modalTitle: {
        fontFamily: FONTS.display,
        fontSize: 24,
        color: COLORS.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    input: {
        fontSize: 48,
        fontFamily: FONTS.display,
        color: COLORS.primary,
        textAlign: 'center',
        minWidth: 120,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.surfaceHighlight,
        paddingBottom: SPACING.xs,
    },
    inputUnit: {
        fontSize: FONT_SIZES.xl,
        color: COLORS.textSecondary,
        fontFamily: FONTS.semibold,
        marginTop: 10,
    },
    modalHint: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    // Detail Modal Styles
    detailModalOverlay: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    detailModalContent: {
        flex: 1,
        padding: SPACING.lg,
        paddingTop: SPACING.xl * 2,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    detailTitle: {
        fontSize: FONT_SIZES.xl,
        fontFamily: FONTS.display,
        color: COLORS.textPrimary,
    },
    closeButton: {
        padding: SPACING.xs,
    },
    rangeSelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: 4,
        marginBottom: SPACING.lg,
    },
    rangeButton: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    rangeButtonActive: {
        backgroundColor: COLORS.primary,
    },
    rangeButtonText: {
        fontSize: FONT_SIZES.sm,
        fontFamily: FONTS.semibold,
        color: COLORS.textSecondary,
    },
    rangeButtonTextActive: {
        // Chalk pill, iron ink — `textPrimary` here was chalk on chalk.
        color: COLORS.onChalk,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    statBox: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
    },
    statBoxLabel: {
        fontFamily: FONTS.medium,
        fontSize: 9,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
    },
    statBoxValue: {
        fontFamily: FONTS.display,
        fontSize: 19,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    detailChartContainer: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        minHeight: 220,
    },
    emptyDetailChart: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl,
    },
    emptyDetailText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
        textAlign: 'center',
    },
    emptyDetailSubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    historyHint: {
        fontSize: 10,
        fontFamily: FONTS.regular,
        color: COLORS.textMuted,
    },
    historyTitle: {
        fontSize: FONT_SIZES.md,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    historyList: {
        flex: 1,
        maxHeight: 150,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    historyDate: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.textMuted,
        textTransform: 'capitalize',
    },
    historyWeight: {
        fontFamily: FONTS.display,
        fontSize: 16,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    noHistoryText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
        paddingVertical: SPACING.lg,
    },
    detailAddButton: {
        marginTop: SPACING.lg,
    },
});
