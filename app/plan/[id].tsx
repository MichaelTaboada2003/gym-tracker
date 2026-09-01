import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { usePlans, PlanWithRoutines, PlanDayInput } from '../../hooks/usePlans';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { formatMinutes } from '../../lib/utils';
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
    };

    const handleUpdatePlan = async (
        planId: string,
        name: string,
        description: string | null,
        durationDays: number,
        days: PlanDayInput[]
    ) => {
        await updatePlan(planId, name, description, durationDays, days);
        await loadPlan();
        setIsEditModalVisible(false);
    };

    const handleViewRoutine = (routineId: string) => {
        router.push(`/routine/${routineId}`);
    };

    /** Launches the workout tab straight into this routine. */
    const handleStartRoutine = (routineId: string) => {
        router.navigate(`/workout?routineId=${routineId}`);
    };

    // Calculate total stats
    const getTotalStats = () => {
        if (!plan) return { totalDays: 0, totalRoutines: 0, totalMinutes: 0 };

        const totalDays = plan.duration_days || plan.items.length;
        const totalRoutines = plan.items.length;
        const totalMinutes = plan.items.reduce((sum, item) =>
            sum + (item.routine?.estimated_duration || 0), 0);

        return { totalDays, totalRoutines, totalMinutes };
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando programa...</Text>
            </View>
        );
    }

    if (!plan) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.errorText}>Plan no encontrado</Text>
                <Button title="Volver" onPress={() => router.back()} />
            </View>
        );
    }

    const stats = getTotalStats();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/routines')}
                    style={styles.headerBtn}
                >
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Programa</Text>
                <TouchableOpacity
                    onPress={() => setIsEditModalVisible(true)}
                    style={[styles.headerBtn, styles.editBtn]}
                >
                    <Ionicons name="pencil" size={17} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroContent}>
                        <View style={styles.heroIconContainer}>
                            <View style={styles.heroIcon}>
                                <Ionicons name="calendar" size={26} color={COLORS.textSecondary} />
                            </View>
                        </View>

                        <Text style={styles.planName}>{plan.name}</Text>
                        {plan.description && (
                            <Text style={styles.planDescription}>{plan.description}</Text>
                        )}

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <View style={[styles.statIconBg, { backgroundColor: COLORS.surfaceLight }]}>
                                    <Ionicons name="calendar-outline" size={17} color={COLORS.textSecondary} />
                                </View>
                                <Text style={styles.statValue}>{stats.totalDays}</Text>
                                <Text style={styles.statLabel}>días</Text>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statItem}>
                                <View style={[styles.statIconBg, { backgroundColor: COLORS.surfaceLight }]}>
                                    <Ionicons name="barbell" size={17} color={COLORS.textSecondary} />
                                </View>
                                <Text style={styles.statValue}>{stats.totalRoutines}</Text>
                                <Text style={styles.statLabel}>rutinas</Text>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statItem}>
                                <View style={[styles.statIconBg, { backgroundColor: COLORS.surfaceLight }]}>
                                    <Ionicons name="time" size={17} color={COLORS.textSecondary} />
                                </View>
                                <Text style={styles.statValue}>{Math.round(stats.totalMinutes / 60) || stats.totalMinutes}</Text>
                                <Text style={styles.statLabel}>{stats.totalMinutes >= 60 ? 'horas' : 'min'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Day overview. Plan days are cycle positions ("Día 1…N"), not
                    weekdays — labelling them Lun/Mar implied a fixed calendar. */}
                {plan.items.length > 0 && (
                    <View style={styles.weekOverview}>
                        <Text style={styles.sectionTitle}>Estructura</Text>
                        <View style={styles.weekGrid}>
                            {Array.from({ length: stats.totalDays }, (_, index) => {
                                const dayNumber = index + 1;
                                const item = plan.items.find((entry) => entry.day_number === dayNumber);

                                return (
                                    <TouchableOpacity
                                        key={dayNumber}
                                        style={[styles.weekDay, item && styles.weekDayActive]}
                                        onPress={() => item && handleViewRoutine(item.routine_id)}
                                        disabled={!item}
                                        accessibilityLabel={
                                            item ? `Día ${dayNumber}: ${item.routine.name}` : `Día ${dayNumber}: descanso`
                                        }
                                    >
                                        <Text style={[styles.weekDayName, item && styles.weekDayNameActive]}>
                                            {dayNumber}
                                        </Text>
                                        {item ? (
                                            <View
                                                style={[
                                                    styles.weekDayDot,
                                                    
                                                ]}
                                            />
                                        ) : (
                                            <Text style={styles.weekDayOff}>—</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Routines List */}
                <View style={styles.routinesSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Rutinas del Programa</Text>
                        <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>{plan.items.length}</Text>
                        </View>
                    </View>

                    <View style={styles.routinesList}>
                        {plan.items.map((item, index) => {
                                                        const routineMinutes = item.routine.estimated_duration;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.routineCard}
                                    onPress={() => handleViewRoutine(item.routine_id)}
                                    activeOpacity={0.7}
                                >
                                    {/* Day indicator */}
                                    <View style={styles.dayBadge}>
                                        <Text style={styles.dayLabel}>Día</Text>
                                        <Text style={styles.dayNumber}>{item.day_number}</Text>
                                    </View>

                                    {/* Routine info */}
                                    <View style={styles.routineInfo}>
                                        <Text style={styles.routineName}>{item.routine.name}</Text>

                                        <View style={styles.routineMetaRow}>
                                            <View style={styles.routineMeta}>
                                                <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                                                <Text style={styles.routineMetaText}>
                                                    {formatMinutes(routineMinutes)}
                                                </Text>
                                            </View>
                                        </View>

                                        {item.notes && (
                                            <View style={styles.notesContainer}>
                                                <Ionicons name="document-text-outline" size={12} color={COLORS.textMuted} />
                                                <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
                                            </View>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.playButton}
                                        onPress={() => handleStartRoutine(item.routine_id)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Empezar ${item.routine.name}`}
                                    >
                                        <Ionicons name="play" size={16} color={COLORS.onChalk} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Empty state for no routines */}
                {plan.items.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyTitle}>Sin rutinas asignadas</Text>
                        <Text style={styles.emptySubtitle}>
                            Edita el programa para agregar rutinas a cada día
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => setIsEditModalVisible(true)}
                        >
                            <Text style={styles.emptyButtonText}>Editar Programa</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <CreatePlanModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onUpdate={handleUpdatePlan}
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
        gap: SPACING.md,
    },
    loadingText: {
        color: COLORS.textSecondary,
        marginTop: SPACING.sm,
    },
    errorText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.lg,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceLight,
    },
    editBtn: {
        backgroundColor: COLORS.surfaceLight,
    },
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontFamily: FONTS.semibold,
        color: COLORS.textPrimary,
    },
    content: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    // Hero Card
    heroCard: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
    },
    heroContent: {
        padding: SPACING.lg,
        alignItems: 'center',
    },
    heroIconContainer: {
        marginBottom: SPACING.md,
    },
    heroIcon: {
        width: 52,
        height: 52,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planName: {
        fontFamily: FONTS.display,
        fontSize: 30,
        lineHeight: 32,
        color: COLORS.textPrimary,
    },
    planDescription: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        width: '100%',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    statValue: {
        fontFamily: FONTS.display,
        fontSize: 22,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.surfaceHighlight,
    },
    // Week Overview
    weekOverview: {
        marginBottom: SPACING.xl,
    },
    weekGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    weekDay: {
        alignItems: 'center',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        minWidth: 40,
    },
    weekDayActive: {
        backgroundColor: COLORS.primary + '15',
    },
    weekDayName: {
        fontSize: 11,
        fontFamily: FONTS.semibold,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    weekDayNameActive: {
        color: COLORS.primary,
    },
    weekDayDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginTop: 4,
        backgroundColor: COLORS.textSecondary,
    },
    weekDayOff: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    sectionBadge: {
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
    },
    sectionBadgeText: {
        fontSize: 12,
        fontFamily: FONTS.semibold,
        color: COLORS.primary,
    },
    // Routines Section
    routinesSection: {
        marginBottom: SPACING.xl,
    },
    routinesList: {
        gap: SPACING.sm,
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
        width: 46,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
    },
    dayLabel: {
        fontFamily: FONTS.medium,
        fontSize: 8,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
    },
    dayNumber: {
        fontFamily: FONTS.display,
        fontSize: 22,
        lineHeight: 24,
        color: COLORS.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    routineInfo: {
        flex: 1,
    },
    routineName: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    routineMetaRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    routineMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    routineMetaText: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    notesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: SPACING.xs,
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
        alignSelf: 'flex-start',
    },
    notesText: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    playButton: {
        width: 34,
        height: 34,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 2,
    },
    // Timeline
    // Empty State
    emptyState: {
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    emptyTitle: {
        fontSize: FONT_SIZES.lg,
        fontFamily: FONTS.semibold,
        color: COLORS.textPrimary,
        marginTop: SPACING.md,
    },
    emptySubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.xs,
        marginBottom: SPACING.lg,
    },
    emptyButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
    },
    emptyButtonText: {
        fontSize: FONT_SIZES.sm,
        fontFamily: FONTS.semibold,
        color: '#FFF',
    },
});
