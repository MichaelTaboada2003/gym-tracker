import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';

// Configure Spanish locale
LocaleConfig.locales['es'] = {
    monthNames: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ],
    monthNamesShort: [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ],
    dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

interface WorkoutSession {
    id: string;
    session_date: string;
    duration_minutes: number;
    routine?: { name: string } | null;
}

interface WorkoutLog {
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    is_warmup: boolean;
    exercise?: { name: string; muscle_group: string };
}

interface DayWorkout {
    session: WorkoutSession;
    exercises: { name: string; muscle_group: string; sets: number; volume: number }[];
    totalVolume: number;
    totalSets: number;
}

export default function CalendarScreen() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [logs, setLogs] = useState<WorkoutLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDayWorkout, setSelectedDayWorkout] = useState<DayWorkout | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data: sessionsData, error: sessionsError } = await supabase
                .from('workout_sessions')
                .select('id, session_date, duration_minutes, routine:routines(name)')
                .order('session_date', { ascending: false });

            if (sessionsError) throw sessionsError;

            const { data: logsData, error: logsError } = await supabase
                .from('workout_logs')
                .select('id, session_id, exercise_id, set_number, weight_kg, reps, is_warmup, exercise:exercises(name, muscle_group)');

            if (logsError) throw logsError;

            setSessions(sessionsData || []);
            setLogs(logsData as any || []);

        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Build marked dates from sessions
    const workoutDates: Record<string, { marked: boolean; dotColor: string }> = {};
    sessions.forEach(session => {
        workoutDates[session.session_date] = {
            marked: true,
            dotColor: COLORS.success,
        };
    });

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);

        const session = sessions.find(s => s.session_date === day.dateString);

        if (session) {
            const sessionLogs = logs.filter(l => l.session_id === session.id && !l.is_warmup);

            const exerciseMap = new Map<string, { name: string; muscle_group: string; sets: number; volume: number }>();

            sessionLogs.forEach(log => {
                const exerciseName = log.exercise?.name || 'Ejercicio';
                const muscleGroup = log.exercise?.muscle_group || '';
                const volume = Number(log.weight_kg) * log.reps;

                if (exerciseMap.has(log.exercise_id)) {
                    const existing = exerciseMap.get(log.exercise_id)!;
                    existing.sets += 1;
                    existing.volume += volume;
                } else {
                    exerciseMap.set(log.exercise_id, {
                        name: exerciseName,
                        muscle_group: muscleGroup,
                        sets: 1,
                        volume,
                    });
                }
            });

            const exercises = Array.from(exerciseMap.values());
            const totalVolume = exercises.reduce((sum, e) => sum + e.volume, 0);
            const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);

            setSelectedDayWorkout({
                session,
                exercises,
                totalVolume,
                totalSets,
            });
        } else {
            setSelectedDayWorkout(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    const monthSessions = sessions.filter(s => s.session_date.startsWith(currentMonth));
    const monthDays = new Set(monthSessions.map(s => s.session_date)).size;
    const monthVolume = monthSessions.reduce((sum, session) => {
        const sessionLogs = logs.filter(l => l.session_id === session.id && !l.is_warmup);
        return sum + sessionLogs.reduce((s, l) => s + Number(l.weight_kg) * l.reps, 0);
    }, 0);

    const getMuscleColor = (muscle: string) => {
        const colors: Record<string, string> = {
            'Pecho': COLORS.chest || '#EF4444',
            'Espalda': COLORS.back || '#3B82F6',
            'Hombros': COLORS.shoulders || '#F59E0B',
            'Bíceps': COLORS.arms || '#8B5CF6',
            'Tríceps': COLORS.arms || '#8B5CF6',
            'Piernas': COLORS.legs || '#10B981',
            'Glúteos': COLORS.legs || '#10B981',
            'Core': COLORS.core || '#EC4899',
            'Cardio': COLORS.cardio || '#06B6D4',
        };
        return colors[muscle] || COLORS.primary;
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/stats')}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Calendario</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={COLORS.primary} />
                }
            >
                <Calendar
                    onDayPress={handleDayPress}
                    onMonthChange={(month) => setCurrentMonth(month.dateString.slice(0, 7))}
                    markedDates={{
                        ...workoutDates,
                        ...(selectedDate && {
                            [selectedDate]: {
                                ...workoutDates[selectedDate],
                                selected: true,
                                selectedColor: COLORS.primary,
                            },
                        }),
                    }}
                    theme={{
                        backgroundColor: COLORS.background,
                        calendarBackground: COLORS.surface,
                        textSectionTitleColor: COLORS.textSecondary,
                        selectedDayBackgroundColor: COLORS.primary,
                        selectedDayTextColor: '#FFF',
                        todayTextColor: COLORS.primary,
                        dayTextColor: COLORS.textPrimary,
                        textDisabledColor: COLORS.textMuted,
                        dotColor: COLORS.success,
                        selectedDotColor: '#FFF',
                        arrowColor: COLORS.primary,
                        monthTextColor: COLORS.textPrimary,
                        indicatorColor: COLORS.primary,
                        textDayFontWeight: '500',
                        textMonthFontWeight: '700',
                        textDayHeaderFontWeight: '600',
                        textDayFontSize: 16,
                        textMonthFontSize: 18,
                        textDayHeaderFontSize: 14,
                    }}
                    style={styles.calendar}
                />

                {/* Selected Day Details */}
                {selectedDate && (
                    <Card style={styles.detailsCard}>
                        <Text style={styles.selectedDateTitle}>{formatDate(selectedDate)}</Text>

                        {selectedDayWorkout ? (
                            <View>
                                <View style={styles.workoutSummary}>
                                    <View style={styles.summaryItem}>
                                        <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                                        <Text style={styles.summaryText}>
                                            {selectedDayWorkout.session.duration_minutes || 0} min
                                        </Text>
                                    </View>
                                    <View style={styles.summaryItem}>
                                        <Ionicons name="layers-outline" size={16} color={COLORS.textSecondary} />
                                        <Text style={styles.summaryText}>
                                            {selectedDayWorkout.totalSets} series
                                        </Text>
                                    </View>
                                    <View style={styles.summaryItem}>
                                        <Ionicons name="barbell-outline" size={16} color={COLORS.textSecondary} />
                                        <Text style={styles.summaryText}>
                                            {Math.round(selectedDayWorkout.totalVolume)} kg
                                        </Text>
                                    </View>
                                </View>

                                {selectedDayWorkout.session.routine && (
                                    <View style={styles.routineBadge}>
                                        <Ionicons name="clipboard" size={14} color={COLORS.primary} />
                                        <Text style={styles.routineName}>
                                            {selectedDayWorkout.session.routine.name}
                                        </Text>
                                    </View>
                                )}

                                <Text style={styles.exercisesTitle}>Ejercicios realizados</Text>
                                {selectedDayWorkout.exercises.map((exercise, index) => (
                                    <View key={index} style={styles.exerciseItem}>
                                        <View style={[styles.muscleIndicator, { backgroundColor: getMuscleColor(exercise.muscle_group) }]} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                                            <Text style={styles.exerciseMeta}>
                                                {exercise.sets} series • {Math.round(exercise.volume)} kg
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={32} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>
                                    No hay entrenamiento registrado
                                </Text>
                            </View>
                        )}
                    </Card>
                )}

                {/* Stats Summary */}
                <Card title="Resumen del Mes">
                    <View style={styles.monthStats}>
                        <View style={styles.monthStat}>
                            <Text style={styles.monthStatValue}>{monthSessions.length}</Text>
                            <Text style={styles.monthStatLabel}>Entrenamientos</Text>
                        </View>
                        <View style={styles.monthStat}>
                            <Text style={styles.monthStatValue}>{monthDays}</Text>
                            <Text style={styles.monthStatLabel}>Días activos</Text>
                        </View>
                        <View style={styles.monthStat}>
                            <Text style={styles.monthStatValue}>{monthVolume >= 1000 ? `${(monthVolume / 1000).toFixed(1)}k` : Math.round(monthVolume)}</Text>
                            <Text style={styles.monthStatLabel}>Volumen (kg)</Text>
                        </View>
                    </View>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    backButton: {
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    calendar: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
    },
    detailsCard: {
        marginBottom: SPACING.lg,
    },
    selectedDateTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textTransform: 'capitalize',
        marginBottom: SPACING.md,
    },
    workoutSummary: {
        flexDirection: 'row',
        gap: SPACING.lg,
        marginBottom: SPACING.md,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    summaryText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    routineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.surfaceLight,
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        marginBottom: SPACING.md,
    },
    routineName: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        fontWeight: '600',
    },
    exercisesTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceHighlight,
    },
    muscleIndicator: {
        width: 4,
        height: 32,
        borderRadius: 2,
        marginRight: SPACING.md,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    exerciseMeta: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    emptyText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    monthStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    monthStat: {
        alignItems: 'center',
    },
    monthStatValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.primary,
    },
    monthStatLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
});
