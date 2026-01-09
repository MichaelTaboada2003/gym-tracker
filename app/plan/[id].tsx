import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { usePlans, PlanWithRoutines } from '../../hooks/usePlans';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';

import { CreatePlanModal } from '../../components/plans/CreatePlanModal';

export default function PlanDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getPlanDetails, updatePlan } = usePlans();
    const [plan, setPlan] = useState<PlanWithRoutines | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    useEffect(() => {
        if (id) {
            loadPlan();
        }
    }, [id]);

    const loadPlan = async () => {
        setLoading(true);
        const data = await getPlanDetails(id as string);
        setPlan(data);
        setLoading(false);
        // Also refresh plans list in background? Maybe not needed here
    };

    const handleUpdatePlan = async (planId: string, name: string, description: string | null, durationDays: number, routines: any[]) => {
        if (!plan) return;
        // Pass id as first arg
        await updatePlan(planId, name, description, durationDays, routines);
        await loadPlan(); // Refresh
        setIsEditModalVisible(false);
    };

    const handleViewRoutine = (routineId: string) => {
        router.push(`/routine/${routineId}`);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!plan) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Plan no encontrado</Text>
                <Button title="Volver" onPress={() => router.back()} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/routines')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detalles del Plan</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(true)} style={styles.backButton}>
                    <Ionicons name="create-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.description && (
                        <Text style={styles.planDescription}>{plan.description}</Text>
                    )}
                </View>

                <Text style={styles.sectionTitle}>Rutinas del Plan</Text>

                <View style={styles.routinesList}>
                    {plan.items.map((item: any) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.routineCard}
                            onPress={() => handleViewRoutine(item.routine_id)}
                        >
                            <View style={styles.dayBadge}>
                                <Text style={styles.dayText}>DÍA</Text>
                                <Text style={styles.dayNumber}>{item.day_number}</Text>
                            </View>

                            <View style={styles.routineContent}>
                                <Text style={styles.routineName}>{item.routine.name}</Text>
                                <Text style={styles.routineDuration}>
                                    <Ionicons name="time-outline" size={14} color={COLORS.textMuted} /> {item.routine.estimated_duration} min
                                </Text>
                                {item.notes && (
                                    <Text style={styles.routineNotes}>{item.notes}</Text>
                                )}
                            </View>

                            <Ionicons name="play-circle-outline" size={32} color={COLORS.primary} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <CreatePlanModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onUpdate={handleUpdatePlan as any}
                initialData={plan}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    content: {
        padding: SPACING.md,
    },
    errorText: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    planHeader: {
        marginBottom: SPACING.xl,
    },
    planName: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    planDescription: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    routinesList: {
        gap: SPACING.md,
    },
    routineCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    dayBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        marginRight: SPACING.md,
        minWidth: 50,
    },
    dayText: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    dayNumber: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    routineContent: {
        flex: 1,
    },
    routineName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    routineDuration: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    routineNotes: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
});
