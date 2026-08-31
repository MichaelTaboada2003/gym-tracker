import { useCallback, useEffect, useState } from 'react';
import { storage } from '../lib/localDatabase';
import { daysBetween, startOfWeek, toISODate } from '../lib/utils';

export interface RecentWorkout {
    id: string;
    routineName: string | null;
    date: string;
    durationMinutes: number;
    sets: number;
    volume: number;
}

export interface HomeStats {
    /** Sessions logged since Monday. */
    thisWeekSessions: number;
    thisWeekVolume: number;
    totalWorkouts: number;
    totalVolume: number;
    /** Consecutive weeks — including the current one — with at least one session. */
    weekStreak: number;
    /** Days since the last session, or null when nothing has been logged yet. */
    daysSinceLastWorkout: number | null;
}

const EMPTY: HomeStats = {
    thisWeekSessions: 0,
    thisWeekVolume: 0,
    totalWorkouts: 0,
    totalVolume: 0,
    weekStreak: 0,
    daysSinceLastWorkout: null,
};

/** Monday of the week containing `isoDate`, as `YYYY-MM-DD`. Used to bucket sessions. */
function weekKey(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    return toISODate(startOfWeek(new Date(year, month - 1, day)));
}

/**
 * Counts consecutive weeks with at least one session, walking backwards from
 * this week. A gap of one week ends the run; an empty *current* week does not,
 * so the streak does not evaporate on Monday morning.
 */
function computeWeekStreak(sessionDates: string[]): number {
    if (sessionDates.length === 0) return 0;

    const trained = new Set(sessionDates.map(weekKey));
    const cursor = startOfWeek();

    if (!trained.has(toISODate(cursor))) {
        cursor.setDate(cursor.getDate() - 7);
        if (!trained.has(toISODate(cursor))) return 0;
    }

    let streak = 0;
    while (trained.has(toISODate(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 7);
    }
    return streak;
}

/** Aggregates everything the home screen shows, in one pass over storage. */
export function useHomeStats() {
    const [stats, setStats] = useState<HomeStats>(EMPTY);
    const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHomeData = useCallback(async () => {
        try {
            const [sessions, logs, routines] = await Promise.all([
                storage.workoutSessions.getAll(),
                storage.workoutLogs.getAll(),
                storage.routines.getAll(),
            ]);

            const routineNames = new Map(routines.map((r) => [r.id, r.name]));

            // sessionId -> { sets, volume }
            const perSession = new Map<string, { sets: number; volume: number }>();
            let totalVolume = 0;
            for (const log of logs) {
                if (log.is_warmup) continue;
                const volume = (Number(log.weight_kg) || 0) * (log.reps || 0);
                totalVolume += volume;
                const bucket = perSession.get(log.session_id);
                if (bucket) {
                    bucket.sets += 1;
                    bucket.volume += volume;
                } else {
                    perSession.set(log.session_id, { sets: 1, volume });
                }
            }

            const sorted = [...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date));
            const weekStart = toISODate(startOfWeek());
            const thisWeek = sorted.filter((s) => s.session_date >= weekStart);

            setStats({
                thisWeekSessions: thisWeek.length,
                thisWeekVolume: thisWeek.reduce((sum, s) => sum + (perSession.get(s.id)?.volume ?? 0), 0),
                totalWorkouts: sorted.length,
                totalVolume,
                weekStreak: computeWeekStreak(sorted.map((s) => s.session_date)),
                daysSinceLastWorkout: sorted[0] ? daysBetween(sorted[0].session_date, toISODate()) : null,
            });

            setRecentWorkouts(
                sorted.slice(0, 4).map((session) => ({
                    id: session.id,
                    routineName: session.routine_id ? (routineNames.get(session.routine_id) ?? null) : null,
                    date: session.session_date,
                    durationMinutes: session.duration_minutes ?? 0,
                    sets: perSession.get(session.id)?.sets ?? 0,
                    volume: perSession.get(session.id)?.volume ?? 0,
                }))
            );
        } catch (error) {
            console.error('[home] stats failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeData();
    }, [fetchHomeData]);

    return { stats, recentWorkouts, loading, fetchHomeData };
}
