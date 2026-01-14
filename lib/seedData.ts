// Helper to generate UUIDs
const generateId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Helper to generate consistent IDs for seeding if needed
const ids = {
    exercises: {
        benchPress: generateId(),
        inclineDbPress: generateId(),
        overheadPress: generateId(),
        latRaises: generateId(),
        dips: generateId(),
        tricepPushdown: generateId(),
        pullups: generateId(),
        barbellRow: generateId(),
        seatedRow: generateId(),
        facePull: generateId(),
        barbellCurl: generateId(),
        inclineCurl: generateId(),
        squat: generateId(),
        rdl: generateId(),
        legPress: generateId(),
        legCurl: generateId(),
        calfRaises: generateId(),
        inclineBench: generateId(),
        peckDeck: generateId(),
        latRaisesCable: generateId(),
        skullcrushers: generateId(),
        tricepExtUni: generateId(),
        latPulldown: generateId(),
        machineRow: generateId(),
        pullover: generateId(),
        reverseFly: generateId(),
        preacherCurl: generateId(),
        hammerCurl: generateId(),
        hackSquat: generateId(),
        lunges: generateId(),
        legExt: generateId(),
        seatedLegCurl: generateId(),
        seatedCalf: generateId(),
    },
    routines: {
        pushA: generateId(),
        pullA: generateId(),
        legsA: generateId(),
        pushB: generateId(),
        pullB: generateId(),
        legsB: generateId(),
    }
};

export const SEED_EXERCISES = [
    // PUSH A
    { id: ids.exercises.benchPress, name: 'Press Banca Plano (Barra)', muscle_group: 'Pecho', equipment: 'barbell', time_per_rep_seconds: 3 },
    { id: ids.exercises.inclineDbPress, name: 'Press Inclinado con Mancuernas', muscle_group: 'Pecho', equipment: 'dumbbell', time_per_rep_seconds: 3 },
    { id: ids.exercises.overheadPress, name: 'Press Militar (Mancuernas)', muscle_group: 'Hombros', equipment: 'dumbbell', time_per_rep_seconds: 3 },
    { id: ids.exercises.latRaises, name: 'Elevaciones Laterales (Mancuernas)', muscle_group: 'Hombros', equipment: 'dumbbell', time_per_rep_seconds: 2 },
    { id: ids.exercises.dips, name: 'Fondos', muscle_group: 'Tríceps', equipment: 'bodyweight', time_per_rep_seconds: 4 },
    { id: ids.exercises.tricepPushdown, name: 'Extensión de Tríceps en Polea', muscle_group: 'Tríceps', equipment: 'cable', time_per_rep_seconds: 2 },

    // PULL A
    { id: ids.exercises.pullups, name: 'Dominadas', muscle_group: 'Espalda', equipment: 'bodyweight', time_per_rep_seconds: 4 },
    { id: ids.exercises.barbellRow, name: 'Remo con Barra', muscle_group: 'Espalda', equipment: 'barbell', time_per_rep_seconds: 3 },
    { id: ids.exercises.seatedRow, name: 'Remo en Polea Baja', muscle_group: 'Espalda', equipment: 'cable', time_per_rep_seconds: 3 },
    { id: ids.exercises.facePull, name: 'Face Pull', muscle_group: 'Hombros', equipment: 'cable', time_per_rep_seconds: 2 },
    { id: ids.exercises.barbellCurl, name: 'Curl con Barra', muscle_group: 'Bíceps', equipment: 'barbell', time_per_rep_seconds: 3 },
    { id: ids.exercises.inclineCurl, name: 'Curl Inclinado con Mancuernas', muscle_group: 'Bíceps', equipment: 'dumbbell', time_per_rep_seconds: 4 },

    // LEGS A
    { id: ids.exercises.squat, name: 'Sentadilla Libre', muscle_group: 'Piernas', equipment: 'barbell', time_per_rep_seconds: 4 },
    { id: ids.exercises.rdl, name: 'Peso Muerto Rumano', muscle_group: 'Piernas', equipment: 'barbell', time_per_rep_seconds: 5 },
    { id: ids.exercises.legPress, name: 'Prensa de Piernas', muscle_group: 'Piernas', equipment: 'machine', time_per_rep_seconds: 3 },
    { id: ids.exercises.legCurl, name: 'Curl Femoral Tumbado', muscle_group: 'Piernas', equipment: 'machine', time_per_rep_seconds: 3 },
    { id: ids.exercises.calfRaises, name: 'Elevación de Talones de Pie', muscle_group: 'Piernas', equipment: 'machine', time_per_rep_seconds: 2 },

    // PUSH B
    { id: ids.exercises.inclineBench, name: 'Press Inclinado (Barra/Multipower)', muscle_group: 'Pecho', equipment: 'barbell', time_per_rep_seconds: 3 },
    { id: ids.exercises.peckDeck, name: 'Peck Deck / Cruce de Poleas', muscle_group: 'Pecho', equipment: 'machine', time_per_rep_seconds: 3 },
    { id: ids.exercises.latRaisesCable, name: 'Elevaciones Laterales en Polea', muscle_group: 'Hombros', equipment: 'cable', time_per_rep_seconds: 2 },
    { id: ids.exercises.skullcrushers, name: 'Press Francés / Rompecráneos', muscle_group: 'Tríceps', equipment: 'barbell', time_per_rep_seconds: 3 },
    { id: ids.exercises.tricepExtUni, name: 'Extensión Tríceps Unilateral', muscle_group: 'Tríceps', equipment: 'cable', time_per_rep_seconds: 2 },

    // PULL B
    { id: ids.exercises.latPulldown, name: 'Jalón al Pecho', muscle_group: 'Espalda', equipment: 'cable', time_per_rep_seconds: 3 },
    { id: ids.exercises.machineRow, name: 'Remo en Máquina (Unilateral)', muscle_group: 'Espalda', equipment: 'machine', time_per_rep_seconds: 3 },
    { id: ids.exercises.pullover, name: 'Pullover en Polea Alta', muscle_group: 'Espalda', equipment: 'cable', time_per_rep_seconds: 3 },
    { id: ids.exercises.reverseFly, name: 'Pájaros (Posterior)', muscle_group: 'Hombros', equipment: 'dumbbell', time_per_rep_seconds: 2 },
    { id: ids.exercises.preacherCurl, name: 'Curl Predicador', muscle_group: 'Bíceps', equipment: 'machine', time_per_rep_seconds: 3 },
    { id: ids.exercises.hammerCurl, name: 'Curl Martillo', muscle_group: 'Bíceps', equipment: 'dumbbell', time_per_rep_seconds: 3 },

    // LEGS B
    { id: ids.exercises.hackSquat, name: 'Hack Squat', muscle_group: 'Piernas', equipment: 'machine', time_per_rep_seconds: 4 },
    { id: ids.exercises.lunges, name: 'Zancadas (Walking Lunges)', muscle_group: 'Piernas', equipment: 'dumbbell', time_per_rep_seconds: 4 },
    { id: ids.exercises.legExt, name: 'Extensión de Cuádriceps', muscle_group: 'Piernas', equipment: 'machine', time_per_rep_seconds: 3 },
    { id: ids.exercises.seatedLegCurl, name: 'Curl Femoral Sentado', muscle_group: 'Piernas', equipment: 'machine', time_per_rep_seconds: 3 },
    { id: ids.exercises.seatedCalf, name: 'Gemelos Sentado', muscle_group: 'Piernas', equipment: 'machine', time_per_rep_seconds: 2 },
];

export const SEED_ROUTINES = [
    { id: ids.routines.pushA, name: 'DÍA 1: PUSH A (Fuerza y Básicos)', description: 'Enfoque: Cargar pesado (manteniendo buena técnica).', estimated_duration: 70 },
    { id: ids.routines.pullA, name: 'DÍA 2: PULL A (Espalda Densidad + Bíceps)', description: 'Enfoque: Grosor de espalda.', estimated_duration: 70 },
    { id: ids.routines.legsA, name: 'DÍA 3: LEGS A (Enfoque Cadena Posterior)', description: 'Enfoque: Isquios y fuerza general.', estimated_duration: 80 },
    { id: ids.routines.pushB, name: 'DÍA 5: PUSH B (Hipertrofia y Bombeo)', description: 'Enfoque: Estética y hombros 3D.', estimated_duration: 65 },
    { id: ids.routines.pullB, name: 'DÍA 6: PULL B (Anchura + Bíceps)', description: 'Enfoque: La forma en "V" de la espalda.', estimated_duration: 65 },
    { id: ids.routines.legsB, name: 'DÍA 7: LEGS B (Enfoque Cuádriceps)', description: 'Enfoque: Piernas grandes y cortes.', estimated_duration: 75 },
];

export const SEED_ROUTINE_EXERCISES = [
    // PUSH A - DÍA 1
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.benchPress, order_index: 0, target_sets: 3, target_reps: '6-8', rest_seconds: 150, notes: 'Descanso: 2-3 min. Baja la barra controlando, sube explosivo.' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.inclineDbPress, order_index: 1, target_sets: 3, target_reps: '8-10', rest_seconds: 105, notes: 'Descanso: 90s-2min. Si las bancas están llenas, usa Chest Press Inclinado.' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.overheadPress, order_index: 2, target_sets: 3, target_reps: '8-10', rest_seconds: 105, notes: 'Descanso: 90s-2min.' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.latRaises, order_index: 3, target_sets: 4, target_reps: '12-15', rest_seconds: 75, notes: 'Descanso: 60-90s. Controla la bajada. No uses impulso.' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.dips, order_index: 4, target_sets: 3, target_reps: '8-10', rest_seconds: 90, notes: 'Descanso: 90s. Paralelas o asistidos.' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.tricepPushdown, order_index: 5, target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Descanso: 60s.' },

    // PULL A - DÍA 2
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.pullups, order_index: 0, target_sets: 4, target_reps: '6-10', rest_seconds: 150, notes: 'Descanso: 2-3 min. Dominadas o Jalón al pecho abierto.' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.barbellRow, order_index: 1, target_sets: 3, target_reps: '8-10', rest_seconds: 120, notes: 'Descanso: 2 min. Máquina de remo es mejor para lumbar.' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.seatedRow, order_index: 2, target_sets: 3, target_reps: '10-12', rest_seconds: 90, notes: 'Descanso: 90s. Agarre estrecho.' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.facePull, order_index: 3, target_sets: 3, target_reps: '15', rest_seconds: 60, notes: 'Descanso: 60s. Tira hacia tu frente, abriendo los codos.' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.barbellCurl, order_index: 4, target_sets: 3, target_reps: '8-10', rest_seconds: 90, notes: 'Descanso: 90s.' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.inclineCurl, order_index: 5, target_sets: 2, target_reps: '10-12', rest_seconds: 75, notes: 'Descanso: 60-90s. Banco inclinado, brazos muertos, sube sin mover codos.' },

    // LEGS A - DÍA 3
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.squat, order_index: 0, target_sets: 3, target_reps: '6-8', rest_seconds: 150, notes: 'Descanso: 2-3 min. Si sientes molestias, usa Hack Squat.' },
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.rdl, order_index: 1, target_sets: 3, target_reps: '8-10', rest_seconds: 120, notes: 'Descanso: 2 min. Baja hasta sentir el tirón en el femoral.' },
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.legPress, order_index: 2, target_sets: 3, target_reps: '10-12', rest_seconds: 105, notes: 'Descanso: 90s-2min. Prensa 45 grados.' },
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.legCurl, order_index: 3, target_sets: 3, target_reps: '10-12', rest_seconds: 75, notes: 'Descanso: 60-90s.' },
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.calfRaises, order_index: 4, target_sets: 4, target_reps: '15', rest_seconds: 60, notes: 'Descanso: 60s.' },

    // PUSH B - DÍA 5
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.inclineBench, order_index: 0, target_sets: 3, target_reps: '8-10', rest_seconds: 120, notes: 'Descanso: 2 min. Multipower da estabilidad para enfocar pecho alto.' },
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.peckDeck, order_index: 1, target_sets: 3, target_reps: '12-15', rest_seconds: 75, notes: 'Descanso: 60-90s. O cruce de poleas.' },
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.latRaisesCable, order_index: 2, target_sets: 4, target_reps: '15', rest_seconds: 60, notes: 'Descanso: 60s. Mantén tensión constante.' },
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.skullcrushers, order_index: 3, target_sets: 3, target_reps: '10-12', rest_seconds: 90, notes: 'Descanso: 90s.' },
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.tricepExtUni, order_index: 4, target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Descanso: 60s. Para corregir asimetrías.' },

    // PULL B - DÍA 6
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.latPulldown, order_index: 0, target_sets: 3, target_reps: '10-12', rest_seconds: 105, notes: 'Descanso: 90s-2min. Agarre Neutro/Triángulo.' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.machineRow, order_index: 1, target_sets: 3, target_reps: '10-12', rest_seconds: 90, notes: 'Descanso: 90s. Unilateral si es posible.' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.pullover, order_index: 2, target_sets: 3, target_reps: '12-15', rest_seconds: 75, notes: 'Descanso: 60-90s. Conecta mente-músculo con dorsales.' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.reverseFly, order_index: 3, target_sets: 4, target_reps: '15-20', rest_seconds: 60, notes: 'Descanso: 60s.' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.preacherCurl, order_index: 4, target_sets: 3, target_reps: '10-12', rest_seconds: 90, notes: 'Descanso: 90s.' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.hammerCurl, order_index: 5, target_sets: 3, target_reps: '10-12', rest_seconds: 75, notes: 'Descanso: 60-90s.' },

    // LEGS B - DÍA 7
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.hackSquat, order_index: 0, target_sets: 3, target_reps: '8-12', rest_seconds: 120, notes: 'Descanso: 2 min. Baja profundo. O Sentadilla Goblet.' },
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.lunges, order_index: 1, target_sets: 3, target_reps: '10 pasos', rest_seconds: 105, notes: 'Descanso: 90s-2min. Usa mancuernas en las manos.' },
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.legExt, order_index: 2, target_sets: 3, target_reps: '12-15 + Drop', rest_seconds: 90, notes: 'Descanso: 90s. Drop set al final: baja peso 50% y al fallo.' },
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.seatedLegCurl, order_index: 3, target_sets: 3, target_reps: '12-15', rest_seconds: 75, notes: 'Descanso: 60-90s.' },
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.seatedCalf, order_index: 4, target_sets: 4, target_reps: '15-20', rest_seconds: 60, notes: 'Descanso: 60s.' },
];
