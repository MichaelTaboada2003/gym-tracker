import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useBodyWeight, DateRange } from '../../hooks/useBodyWeight';

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
    { key: '7d', label: '7D' },
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '1y', label: '1A' },
    { key: 'all', label: 'Todo' },
];

export const BodyWeightWidget = () => {
    const { weightLogs, currentWeight, addWeightLog, getLogsForRange, getStatsForRange, fetchWeightLogs } = useBodyWeight();
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
            .map((log, index, arr) => {
                const date = new Date(log.date);
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
                const date = new Date(log.date);
                const isMonthStart = date.getDate() === 1 || logs.length <= 10;
                return {
                    value: log.weight_kg,
                    label: isMonthStart ? `${date.getDate()}/${date.getMonth() + 1}` : '',
                    dataPointText: '',
                    date: log.date,
                };
            });
    }, [getLogsForRange, detailRange]);

    // Calculate trend (from stats)
    const stats = useMemo(() => getStatsForRange('7d'), [getStatsForRange]);
    const detailStats = useMemo(() => getStatsForRange(detailRange), [getStatsForRange, detailRange]);

    const handleAddWeight = async () => {
        if (!newWeight) return;
        const weight = parseFloat(newWeight.replace(',', '.'));
        if (isNaN(weight) || weight <= 0 || weight > 500) return;

        const success = await addWeightLog(weight);
        if (success) {
            setNewWeight('');
            setIsModalVisible(false);
        }
    };

    const formatChange = (change: number) => {
        const sign = change > 0 ? '+' : '';
        return `${sign}${change.toFixed(1)} kg`;
    };

    return (
        <View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setIsDetailModalVisible(true)}>
                <Card title="Peso Corporal">
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
                                        { backgroundColor: stats.change <= 0 ? COLORS.success + '20' : COLORS.warning + '20' }
                                    ]}>
                                        <Ionicons
                                            name={stats.change > 0 ? "caret-up" : "caret-down"}
                                            size={12}
                                            color={stats.change <= 0 ? COLORS.success : COLORS.warning}
                                        />
                                        <Text style={[
                                            styles.trendText,
                                            { color: stats.change <= 0 ? COLORS.success : COLORS.warning }
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
                                        startFillColor={COLORS.primary + '40'}
                                        endFillColor={COLORS.primary + '05'}
                                        startOpacity={0.4}
                                        endOpacity={0}
                                        xAxisLabelsHeight={0}
                                        yAxisOffset={0}
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
                                title="Registrar Peso"
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
                        <Text style={styles.modalTitle}>Registrar Peso</Text>

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
                                    { color: detailStats.change <= 0 ? COLORS.success : COLORS.warning }
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
                                        yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
                                        xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 9 }}
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
                        <Text style={styles.historyTitle}>Registros Recientes</Text>
                        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                            {getLogsForRange(detailRange).slice(0, 10).map((log, index) => {
                                const date = new Date(log.date);
                                const dateStr = date.toLocaleDateString('es-ES', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                });
                                return (
                                    <View key={log.id} style={styles.historyItem}>
                                        <Text style={styles.historyDate}>{dateStr}</Text>
                                        <Text style={styles.historyWeight}>{log.weight_kg.toFixed(1)} kg</Text>
                                    </View>
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
    container: {
        gap: SPACING.md,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currentWeightLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    weightValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    currentWeight: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    unit: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontWeight: '600',
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
        fontWeight: '700',
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
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
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
        fontWeight: '800',
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
        fontWeight: '600',
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
        fontWeight: '800',
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
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    rangeButtonTextActive: {
        color: COLORS.textPrimary,
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
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statBoxValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
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
    historyTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
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
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    historyWeight: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
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
