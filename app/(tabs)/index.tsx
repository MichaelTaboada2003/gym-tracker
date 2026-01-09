import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GradientText } from '../../components/ui/GradientText';
import { supabase } from '../../lib/supabase';

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

            // Fetch all workout sessions
            const { data: sessions, error: sessionsError } = await supabase
                .from('workout_sessions')
                .select('*, routine:routines(name)')
                .order('session_date', { ascending: false });

            if (sessionsError) throw sessionsError;

            // Fetch all workout logs for volume calculation
            const { data: logs, error: logsError } = await supabase
                .from('workout_logs')
                .select('weight_kg, reps, is_warmup, session_id');

            if (logsError) throw logsError;

            // Calculate total workouts
            const totalWorkouts = sessions?.length || 0;

            // Calculate this week's workouts
            const today = new Date();
            const startOfWeek = new Date(today);
            const dayOfWeek = today.getDay();
            startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            startOfWeek.setHours(0, 0, 0, 0);

            const thisWeek = sessions?.filter(s => {
                const sessionDate = new Date(s.session_date);
                return sessionDate >= startOfWeek;
            }).length || 0;

            // Calculate total volume
            const workLogs = logs?.filter(l => !l.is_warmup) || [];
            const totalVolume = workLogs.reduce((sum, l) => sum + (Number(l.weight_kg) * l.reps), 0);

            // Calculate streak (simplified - consecutive days with workouts)
            let streak = 0;
            if (sessions && sessions.length > 0) {
                const sortedSessions = [...sessions].sort((a, b) =>
                    new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
                );

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
            const recentData: RecentWorkout[] = (sessions?.slice(0, 3) || []).map(s => {
                const sessionLogs = logs?.filter(l => l.session_id === s.id && !l.is_warmup) || [];
                return {
                    id: s.id,
                    routineName: s.routine?.name || null,
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
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={loading} onRefresh={fetchHomeData} tintColor={COLORS.primary} />
            }
        >
            {/* Hero Section */}
            <View style={styles.heroSection}>
                <View>
                    <Text style={styles.greetingSub}>Bienvenido de nuevo</Text>
                    <GradientText style={styles.greetingTitle} colors={COLORS.gradients.primary}>
                        ¡A Entrenar!
                    </GradientText>
                </View>
                <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={20} color={COLORS.warning} />
                    <Text style={styles.streakText}>{stats.streak} días</Text>
                </View>
            </View>

            {/* Quick Actions Card */}
            <LinearGradient
                colors={['#1E1E2E', '#2D2D44']}
                style={styles.actionCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.actionContent}>
                    <View>
                        <Text style={styles.actionTitle}>Rutina de Hoy</Text>
                        <Text style={styles.actionSubtitle}>No hay rutina programada</Text>
                    </View>
                    <Button
                        title="Iniciar"
                        onPress={() => router.push('/workout')}
                        variant="gradient"
                        size="md"
                        icon={<Ionicons name="play" size={18} color="#FFF" />}
                    />
                </View>
            </LinearGradient>

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
    heroSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.md,
    },
    greetingSub: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    greetingTitle: {
        fontSize: 34,
        fontWeight: '800',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    streakText: {
        color: COLORS.textPrimary,
        fontWeight: '600',
        fontSize: FONT_SIZES.sm,
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
