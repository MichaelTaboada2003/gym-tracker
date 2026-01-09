// Epley formula for estimated 1RM
export function calculate1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 100) / 100;
}

// Calculate total volume (weight × reps × sets)
export function calculateVolume(sets: { weight: number; reps: number }[]): number {
    return sets.reduce((total, set) => total + set.weight * set.reps, 0);
}

// Format weight for display
export function formatWeight(kg: number): string {
    if (kg % 1 === 0) return `${kg}`;
    return kg.toFixed(1);
}

// Format date for display
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

// Format duration in minutes to readable string
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
