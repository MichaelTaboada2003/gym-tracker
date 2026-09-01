/**
 * Shared formatting and small domain helpers.
 *
 * Every screen used to carry its own `formatDuration` / `formatVolume` /
 * `formatDate`, which drifted apart (one printed "70min", another "1h 10m",
 * a third "1.2t"). These are the single definitions.
 */

// =============================================================================
// Strength maths
// =============================================================================

/**
 * Estimated one-rep max, Epley: `1RM = w × (1 + reps/30)`.
 * Reliable to roughly 10 reps; beyond that it overestimates.
 */
export function calculate1RM(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Total tonnage of a list of sets. */
export function calculateVolume(sets: { weight: number; reps: number }[]): number {
    return sets.reduce((total, set) => total + set.weight * set.reps, 0);
}

// =============================================================================
// Numbers
// =============================================================================

/** `72.5` → "72.5", `70` → "70". Avoids the trailing ".0". */
export function formatWeight(kg: number): string {
    if (!Number.isFinite(kg)) return '0';
    return kg % 1 === 0 ? `${kg}` : kg.toFixed(1);
}

/** Compact tonnage: 850 → "850 kg", 12 400 → "12.4 t". */
export function formatVolume(kg: number): string {
    if (!Number.isFinite(kg) || kg <= 0) return '0 kg';
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
    return `${Math.round(kg)} kg`;
}

/** Compact tonnage without the unit, for tight stat tiles. */
export function formatVolumeShort(kg: number): string {
    if (!Number.isFinite(kg) || kg <= 0) return '0';
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
    return `${Math.round(kg)}`;
}

// =============================================================================
// Durations
// =============================================================================

/** Minutes → "45 min" / "1h 15min". */
export function formatMinutes(minutes: number): string {
    const safe = Math.max(0, Math.round(minutes || 0));
    if (safe < 60) return `${safe} min`;
    const hours = Math.floor(safe / 60);
    const mins = safe % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/** Seconds → "45s" / "2 min" / "1m 30s". Used for rest targets. */
export function formatSeconds(seconds: number): string {
    const safe = Math.max(0, Math.round(seconds || 0));
    if (safe < 60) return `${safe}s`;
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
}

/**
 * Seconds → "2:05", or "1:05:30" past the hour.
 *
 * Used by both the rest countdown and the session clock; a long workout would
 * otherwise read as "72:14" instead of "1:12:14".
 */
export function formatClock(seconds: number): string {
    const safe = Math.max(0, Math.round(seconds || 0));
    const hours = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// =============================================================================
// Dates
// =============================================================================

/**
 * Local calendar day as `YYYY-MM-DD`.
 *
 * `toISOString().split('T')[0]` — used all over the old code — converts to UTC
 * first, so anyone west of Greenwich logged evening workouts on the next day.
 */
export function toISODate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD` as a *local* midnight, not a UTC one. */
export function parseISODate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    return new Date(year, month - 1, day);
}

/** Whole calendar days between two `YYYY-MM-DD` values (b − a). */
export function daysBetween(a: string, b: string): number {
    const from = parseISODate(a).getTime();
    const to = parseISODate(b).getTime();
    return Math.round((to - from) / 86_400_000);
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: Date = new Date()): Date {
    const result = new Date(date);
    const weekday = result.getDay(); // 0 = Sunday
    const offset = weekday === 0 ? 6 : weekday - 1;
    result.setDate(result.getDate() - offset);
    result.setHours(0, 0, 0, 0);
    return result;
}

/** Monday-based index, 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: Date): number {
    const weekday = date.getDay();
    return weekday === 0 ? 6 : weekday - 1;
}

/** "Hoy" / "Ayer" / "lun, 3 mar" for a `YYYY-MM-DD` value. */
export function formatRelativeDate(isoDate: string): string {
    const today = toISODate();
    if (isoDate === today) return 'Hoy';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (isoDate === toISODate(yesterday)) return 'Ayer';

    return parseISODate(isoDate).toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

/** "lunes, 3 de marzo" for a `YYYY-MM-DD` value. */
export function formatLongDate(isoDate: string): string {
    return parseISODate(isoDate).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
}

// =============================================================================
// Parsing
// =============================================================================

/**
 * First number in a rep target: "8-10" → 8, "12" → 12, "10 pasos" → 10,
 * "AMRAP" → `fallback`.
 */
export function parseTargetReps(target: string | number | null | undefined, fallback = 10): number {
    if (typeof target === 'number') return Number.isFinite(target) ? target : fallback;
    if (!target) return fallback;
    const match = target.match(/\d+/);
    if (!match) return fallback;
    const value = Number(match[0]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

// =============================================================================
// Equipment
// =============================================================================

/**
 * The bundled catalogue stores equipment as English slugs ("barbell") while the
 * editor writes Spanish labels ("Barra"), so the list showed a mix of both.
 * This normalises for display without rewriting stored data.
 */
const EQUIPMENT_LABELS: Record<string, string> = {
    barbell: 'Barra',
    dumbbell: 'Mancuernas',
    machine: 'Máquina',
    cable: 'Polea',
    bodyweight: 'Peso corporal',
    kettlebell: 'Kettlebell',
    bands: 'Bandas',
    other: 'Otro',
};

export function formatEquipment(equipment?: string | null): string {
    if (!equipment) return '';
    return EQUIPMENT_LABELS[equipment.trim().toLowerCase()] ?? equipment;
}
