import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useBodyWeight } from '../../hooks/useBodyWeight';

export const BodyWeightWidget = () => {
    const { weightLogs, currentWeight, addWeightLog } = useBodyWeight();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newWeight, setNewWeight] = useState('');

    // Prepare chart data (reverse to show chronological order left to right)
    const chartData = [...weightLogs]
        .slice(0, 10) // Last 10 entries
        .reverse()
        .map(log => ({
            value: log.weight_kg,
            label: new Date(log.date).getDate().toString(),
            dataPointText: log.weight_kg.toString(),
            hideDataPoint: true,
        }));

    // Calculate trend (difference between last two specific logs)
    let trend = 0;
    if (weightLogs.length >= 2) {
        trend = weightLogs[0].weight_kg - weightLogs[1].weight_kg;
    }

    const handleAddWeight = async () => {
        if (!newWeight) return;
        const weight = parseFloat(newWeight.replace(',', '.'));
        if (isNaN(weight)) return;

        const success = await addWeightLog(weight);
        if (success) {
            setNewWeight('');
            setIsModalVisible(false);
        }
    };

    return (
        <View>
            <Card title="Peso Corporal">
                <View style={styles.container}>
                    <View style={styles.statsContainer}>
                        <View>
                            <Text style={styles.currentWeightLabel}>Actual</Text>
                            <View style={styles.weightValueRow}>
                                <Text style={styles.currentWeight}>
                                    {currentWeight ? currentWeight : '--'}
                                </Text>
                                <Text style={styles.unit}>kg</Text>
                            </View>
                            {weightLogs.length >= 2 && (
                                <View style={[styles.trendContainer, { backgroundColor: trend <= 0 ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                                    <Ionicons
                                        name={trend > 0 ? "caret-up" : "caret-down"}
                                        size={12}
                                        color={trend <= 0 ? COLORS.success : COLORS.warning}
                                    />
                                    <Text style={[styles.trendText, { color: trend <= 0 ? COLORS.success : COLORS.warning }]}>
                                        {Math.abs(trend).toFixed(1)} kg
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.chartWrapper}>
                            {chartData.length > 1 ? (
                                <LineChart
                                    data={chartData}
                                    height={60}
                                    width={140}
                                    hideRules={true}
                                    hideDataPoints={false}
                                    hideAxesAndRules={true}
                                    color={COLORS.primary}
                                    thickness={3}
                                    curved={true}
                                    isAnimated={true}
                                    initialSpacing={0}
                                />
                            ) : (
                                <View style={styles.emptyChart}>
                                    <Text style={styles.emptyChartText}>Registra más datos</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Button
                        title="Registrar Peso"
                        variant="secondary"
                        size="sm"
                        icon={<Ionicons name="add" size={16} color={COLORS.textPrimary} />}
                        onPress={() => setIsModalVisible(true)}
                        style={styles.addButton}
                    />
                </View>
            </Card>

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
        height: 60,
        justifyContent: 'center',
        paddingRight: SPACING.sm,
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
    addButton: {
        marginTop: SPACING.xs,
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
        marginBottom: SPACING.xl,
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
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
});
