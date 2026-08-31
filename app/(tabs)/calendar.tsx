import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getMuscleColor } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { storage, deleteSessionCascade } from '../../lib/localDatabase';
import { formatLongDate, formatMinutes, formatVolume, formatVolumeShort, toISODate } from '../../lib/utils';

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
    routine_id?: string | null;
    routineName?: string | null;
}

interface WorkoutLog {
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    is_warmup: boolean | number;
    exerciseName?: string;
    muscleGroup?: string;
}

interface DayWorkout {
    sessions: WorkoutSession[];
    exercises: { name: string; muscle_group: string; sets: number; volume: number }[];
    totalVolume: number;
    totalSets: number;
    totalMinutes: number;
}

export default function CalendarScreen() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [logs, setLogs] = useState<WorkoutLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDayWorkout, setSelectedDayWorkout] = useState<DayWorkout | null>(null);
    const [currentMonth, setCurrentMonth] = useState(toISODate().slice(0, 7));

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch from AsyncStorage
            const sessionsData = await storage.workoutSessions.getAll() as any[];
            const logsData = await storage.workoutLogs.getAll() as any[];
            const routinesData = await storage.routines.getAll() as any[];
            const exercisesData = await storage.exercises.getAll() as any[];

            // Add routine names to sessions
            const sessionsWithRoutines = sessionsData.map(s => {
                const routine = routinesData.find(r => r.id === s.routine_id);
                return { ...s, routineName: routine?.name || null };
            });

            // Add exercise info to logs
            const logsWithExercises = logsData.map(l => {
                const exercise = exercisesData.find(e => e.id === l.exercise_id);
                return {
                    ...l,
                    is_warmup: l.is_warmup === 1 || l.is_warmup === true,
                    exerciseName: exercise?.name || 'Ejercicio',
                    muscleGroup: exercise?.muscle_group || '',
                };
            });

            setSessions(sessionsWithRoutines);
            setLogs(logsWithExercises);

        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useRefreshOnFocus(fetchData);

    // Build marked dates from sessions
    const workoutDates: Record<string, { marked: boolean; dotColor: string }> = {};
    sessions.forEach(session => {
        workoutDates[session.session_date] = {
            marked: true,
            dotColor: COLORS.success,
        };
    });

    /**
     * Removes a mis-logged session. Nothing else in the app could delete one,
     * so a fat-fingered workout stayed in the stats forever.
     */
    const confirmDeleteSession = (sessionId: string, label: string) => {
        Alert.alert('Eliminar entrenamiento', `Se borrará "${label}" y todas sus series.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    await deleteSessionCascade(sessionId);
                    setSelectedDayWorkout(null);
                    setSelectedDate(null);
                    await fetchData();
                },
            },
        ]);
    };

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);

        // Two sessions on one day used to hide the second one entirely.
        const daySessions = sessions.filter((s) => s.session_date === day.dateString);
        if (daySessions.length === 0) {
            setSelectedDayWorkout(null);
            return;
        }

        const sessionIds = new Set(daySessions.map((s) => s.id));
        const dayLogs = logs.filter((l) => sessionIds.has(l.session_id) && !l.is_warmup);

        const exerciseMap = new Map<string, { name: string; muscle_group: string; sets: number; volume: number }>();
        dayLogs.forEach((log) => {
            const volume = Number(log.weight_kg) * log.reps;
            const existing = exerciseMap.get(log.exercise_id);
            if (existing) {
                existing.sets += 1;
                existing.volume += volume;
            } else {
                exerciseMap.set(log.exercise_id, {
                    name: log.exerciseName || 'Ejercicio',
                    muscle_group: log.muscleGroup || '',
                    sets: 1,
                    volume,
                });
            }
        });

        const exercises = Array.from(exerciseMap.values());
        setSelectedDayWorkout({
            sessions: daySessions,
            exercises,
            totalVolume: exercises.reduce((sum, e) => sum + e.volume, 0),
            totalSets: exercises.reduce((sum, e) => sum + e.sets, 0),
            totalMinutes: daySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
        });
    };

    const monthSessions = sessions.filter(s => s.session_date.startsWith(currentMonth));
    const monthDays = new Set(monthSessions.map(s => s.session_date)).size;
    const monthVolume = monthSessions.reduce((sum, session) => {
        const sessionLogs = logs.filter(l => l.session_id === session.id && !l.is_warmup);
        return sum + sessionLogs.reduce((s, l) => s + Number(l.weight_kg) * l.reps, 0);
    }, 0);

    return (
        <View style={styles.container}>
            <ScreenHeader
                eyebrow="Historial"
                title="Calendario"
                onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/stats'))}
            />

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
                        <Text style={styles.selectedDateTitle}>{formatLongDate(selectedDate)}</Text>

                        {selectedDayWorkout ? (
                            <View>
                                <View style={styles.workoutSummary}>
                                    <View style={styles.summaryItem}>
                                        <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                                        <Text style={styles.summaryText}>
                                            {formatMinutes(selectedDayWorkout.totalMinutes)}
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
                                            {formatVolume(selectedDayWorkout.totalVolume)}
                                        </Text>
                                    </View>
                                </View>

                                {selectedDayWorkout.sessions.map((session) => {
                                    const label = session.routineName || 'Entrenamiento libre';
                                    return (
                                        <View key={session.id} style={styles.routineBadge}>
                                            <Ionicons name="clipboard" size={14} color={COLORS.primary} />
                                            <Text style={styles.routineName}>{label}</Text>
                                            <TouchableOpacity
                                                onPress={() => confirmDeleteSession(session.id, label)}
                                                style={styles.deleteSessionBtn}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Eliminar ${label}`}
                                            >
                                                <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}

                                <Text style={styles.exercisesTitle}>Ejercicios realizados</Text>
                                {selectedDayWorkout.exercises.map((exercise, index) => (
                                    <View key={index} style={styles.exerciseItem}>
                                        <View style={[styles.muscleIndicator, { backgroundColor: getMuscleColor(exercise.muscle_group) }]} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                                            <Text style={styles.exerciseMeta}>
                                                {exercise.sets} series · {formatVolume(exercise.volume)}
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
                            <Text style={styles.monthStatValue}>{formatVolumeShort(monthVolume)}</Text>
                            <Text style={styles.monthStatLabel}>Volumen (kg)</Text>
                        </View>
                    </View>
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
    deleteSessionBtn: {
        marginLeft: 'auto',
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
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
