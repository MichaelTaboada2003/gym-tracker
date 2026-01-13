import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BodyWeightWidget } from '../../components/home/BodyWeightWidget';
import { GradientText } from '../../components/ui/GradientText';
import { storage } from '../../lib/localDatabase';

interface HomeStats {
    totalWorkouts: number;
    thisWeek: number;
    streak: number;
    totalVolume: number;
}

interface RecentWorkout {
    id: string;
    routineName: string | null;
    date: string;
    duration: number;
    sets: number;
}

export default function HomeScreen() {
    const router = useRouter();
    const [stats, setStats] = useState<HomeStats>({
        totalWorkouts: 0,
        thisWeek: 0,
        streak: 0,
        totalVolume: 0,
    });
    const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHomeData = async () => {
        try {
            setLoading(true);

            // Fetch all workout sessions from AsyncStorage
            const sessions = await storage.workoutSessions.getAll() as any[];
            const logs = await storage.workoutLogs.getAll() as any[];
            const routines = await storage.routines.getAll() as any[];

            // Sort sessions by date descending
            const sortedSessions = sessions.sort((a, b) =>
                new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
            );

            // Calculate total workouts
            const totalWorkouts = sortedSessions.length;

            // Calculate this week's workouts
            const today = new Date();
            const startOfWeek = new Date(today);
            const dayOfWeek = today.getDay();
            startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            startOfWeek.setHours(0, 0, 0, 0);

            const thisWeek = sortedSessions.filter(s => {
                const sessionDate = new Date(s.session_date);
                return sessionDate >= startOfWeek;
            }).length;

            // Calculate total volume (excluding warmups)
            const workLogs = logs.filter(l => l.is_warmup !== 1 && l.is_warmup !== true);
            const totalVolume = workLogs.reduce((sum, l) => sum + (Number(l.weight_kg) * l.reps), 0);

            // Calculate streak (simplified - consecutive days with workouts)
            let streak = 0;
            if (sortedSessions.length > 0) {
                const todayStr = today.toISOString().split('T')[0];
                const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0];

                // Check if today or yesterday had a workout
                const recentDate = sortedSessions[0]?.session_date;
                if (recentDate === todayStr || recentDate === yesterdayStr) {
                    streak = 1;
                    let checkDate = new Date(recentDate);

                    for (let i = 1; i < sortedSessions.length; i++) {
                        checkDate.setDate(checkDate.getDate() - 1);
                        const checkDateStr = checkDate.toISOString().split('T')[0];
                        if (sortedSessions.some(s => s.session_date === checkDateStr)) {
                            streak++;
                        } else {
                            break;
                        }
                    }
                }
            }

            setStats({
                totalWorkouts,
                thisWeek,
                streak,
                totalVolume,
            });

            // Get recent workouts (last 3)
            const recentData: RecentWorkout[] = sortedSessions.slice(0, 3).map(s => {
                const routine = routines.find(r => r.id === s.routine_id);
                const sessionLogs = logs.filter(l => l.session_id === s.id && l.is_warmup !== 1 && l.is_warmup !== true);
                return {
                    id: s.id,
                    routineName: routine?.name || null,
                    date: s.session_date,
                    duration: s.duration_minutes || 0,
                    sets: sessionLogs.length,
                };
            });
            setRecentWorkouts(recentData);

        } catch (error) {
            console.error('Error fetching home data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHomeData();
    }, []);

    const formatVolume = (kg: number) => {
        if (kg >= 1000) return `${(kg / 1000).toFixed(0)}k`;
        return `${Math.round(kg)}`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === today.toISOString().split('T')[0]) return 'Hoy';
        if (dateStr === yesterday.toISOString().split('T')[0]) return 'Ayer';

        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
        <View style={styles.container}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={[COLORS.primary + '15', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerSubtitle}>HOLA DE NUEVO</Text>
                        <Text style={styles.headerTitle}>Resumen</Text>
                    </View>
                    <View style={styles.headerButtons}>
                        <View style={styles.streakBadgeContainer}>
                            <LinearGradient
                                colors={['#F59E0B20', '#F59E0B10']}
                                style={styles.streakBadgeGradient}
                            >
                                <Ionicons name="flame" size={20} color={COLORS.warning} />
                                <Text style={styles.streakText}>{stats.streak}</Text>
                            </LinearGradient>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchHomeData} tintColor={COLORS.primary} />
                }
            >



                {/* Stats Overview */}
                <Text style={styles.sectionTitle}>Tu Progreso Semanal</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <LinearGradient
                            colors={COLORS.gradients.glass}
                            style={styles.statGradient}
                        >
                            <Ionicons name="barbell-outline" size={24} color={COLORS.primaryLight} />
                            <Text style={styles.statValue}>{stats.thisWeek}</Text>
                            <Text style={styles.statLabel}>Sessions</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.statItem}>
                        <LinearGradient
                            colors={COLORS.gradients.glass}
                            style={styles.statGradient}
                        >
                            <Ionicons name="layers-outline" size={24} color={COLORS.secondaryLight} />
                            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.statItem}>
                        <LinearGradient
                            colors={COLORS.gradients.glass}
                            style={styles.statGradient}
                        >
                            <Ionicons name="trending-up-outline" size={24} color={COLORS.success} />
                            <Text style={styles.statValue}>{formatVolume(stats.totalVolume)}</Text>
                            <Text style={styles.statLabel}>Volumen</Text>
                        </LinearGradient>
                    </View>
                </View>

                {/* Body Weight Widget */}
                <View style={{ marginTop: SPACING.xl }}>
                    <BodyWeightWidget />
                </View>

                {/* Recent Activity */}
                <Text style={styles.sectionTitle}>Actividad Reciente</Text>
                <Card variant="glass" style={styles.recentCard}>
                    {recentWorkouts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="analytics-outline" size={32} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyText}>
                                Aún no hay registros recientes.
                            </Text>
                            <Button
                                title="Ver Historial"
                                variant="ghost"
                                size="sm"
                                onPress={() => router.push('/stats')}
                            />
                        </View>
                    ) : (
                        <View style={styles.recentList}>
                            {recentWorkouts.map((workout) => (
                                <View key={workout.id} style={styles.recentItem}>
                                    <View style={styles.recentIcon}>
                                        <Ionicons name="fitness" size={20} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.recentInfo}>
                                        <Text style={styles.recentName}>
                                            {workout.routineName || 'Entrenamiento Libre'}
                                        </Text>
                                        <Text style={styles.recentMeta}>
                                            {formatDate(workout.date)} • {workout.sets} series • {workout.duration} min
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            <Button
                                title="Ver Historial"
                                variant="ghost"
                                size="sm"
                                onPress={() => router.push('/stats')}
                            />
                        </View>
                    )}
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.lg,
        paddingBottom: 100, // Space for tab bar
    },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 3,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    headerTitle: {
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    streakBadgeContainer: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    streakBadgeGradient: {
        height: 48,
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
    },
    streakText: {
        color: COLORS.warning,
        fontWeight: '700',
        fontSize: FONT_SIZES.md,
    },
    scrollView: {
        flex: 1,
    },
    actionCard: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    actionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    actionSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    statItem: {
        flex: 1,
    },
    statGradient: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.overlay.light,
    },
    statValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    recentCard: {
        minHeight: 120,
    },
    emptyState: {
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    recentList: {
        gap: SPACING.md,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    recentIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentInfo: {
        flex: 1,
    },
    recentName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    recentMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
});
