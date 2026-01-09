export const MUSCLE_GROUPS = [
    { id: 'chest', name: 'Pecho', icon: '💪' },
    { id: 'back', name: 'Espalda', icon: '🔙' },
    { id: 'shoulders', name: 'Hombros', icon: '🏋️' },
    { id: 'biceps', name: 'Bíceps', icon: '💪' },
    { id: 'triceps', name: 'Tríceps', icon: '💪' },
    { id: 'legs', name: 'Piernas', icon: '🦵' },
    { id: 'glutes', name: 'Glúteos', icon: '🍑' },
    { id: 'core', name: 'Core', icon: '🎯' },
    { id: 'cardio', name: 'Cardio', icon: '❤️' },
] as const;

export const EQUIPMENT_TYPES = [
    { id: 'barbell', name: 'Barra' },
    { id: 'dumbbell', name: 'Mancuernas' },
    { id: 'cable', name: 'Polea' },
    { id: 'machine', name: 'Máquina' },
    { id: 'bodyweight', name: 'Peso Corporal' },
    { id: 'kettlebell', name: 'Kettlebell' },
    { id: 'bands', name: 'Bandas' },
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number]['id'];
export type EquipmentType = typeof EQUIPMENT_TYPES[number]['id'];
