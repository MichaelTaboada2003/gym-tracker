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
    { id: ids.exercises.benchPress, name: 'Press Banca Plano (Barra)', muscle_group: 'Pecho', equipment: 'barbell' },
    { id: ids.exercises.inclineDbPress, name: 'Press Inclinado con Mancuernas', muscle_group: 'Pecho', equipment: 'dumbbell' },
    { id: ids.exercises.overheadPress, name: 'Press Militar (Mancuernas)', muscle_group: 'Hombros', equipment: 'dumbbell' },
    { id: ids.exercises.latRaises, name: 'Elevaciones Laterales (Mancuernas)', muscle_group: 'Hombros', equipment: 'dumbbell' },
    { id: ids.exercises.dips, name: 'Fondos', muscle_group: 'Tríceps', equipment: 'bodyweight' },
    { id: ids.exercises.tricepPushdown, name: 'Extensión de Tríceps en Polea', muscle_group: 'Tríceps', equipment: 'cable' },

    // PULL A
    { id: ids.exercises.pullups, name: 'Dominadas', muscle_group: 'Espalda', equipment: 'bodyweight' },
    { id: ids.exercises.barbellRow, name: 'Remo con Barra', muscle_group: 'Espalda', equipment: 'barbell' },
    { id: ids.exercises.seatedRow, name: 'Remo en Polea Baja', muscle_group: 'Espalda', equipment: 'cable' },
    { id: ids.exercises.facePull, name: 'Face Pull', muscle_group: 'Hombros', equipment: 'cable' },
    { id: ids.exercises.barbellCurl, name: 'Curl con Barra', muscle_group: 'Bíceps', equipment: 'barbell' },
    { id: ids.exercises.inclineCurl, name: 'Curl Inclinado con Mancuernas', muscle_group: 'Bíceps', equipment: 'dumbbell' },

    // LEGS A
    { id: ids.exercises.squat, name: 'Sentadilla Libre', muscle_group: 'Piernas', equipment: 'barbell' },
    { id: ids.exercises.rdl, name: 'Peso Muerto Rumano', muscle_group: 'Piernas', equipment: 'barbell' },
    { id: ids.exercises.legPress, name: 'Prensa de Piernas', muscle_group: 'Piernas', equipment: 'machine' },
    { id: ids.exercises.legCurl, name: 'Curl Femoral Tumbado', muscle_group: 'Piernas', equipment: 'machine' },
    { id: ids.exercises.calfRaises, name: 'Elevación de Talones de Pie', muscle_group: 'Piernas', equipment: 'machine' },

    // PUSH B
    { id: ids.exercises.inclineBench, name: 'Press Inclinado (Barra/Multipower)', muscle_group: 'Pecho', equipment: 'barbell' },
    { id: ids.exercises.peckDeck, name: 'Peck Deck / Cruce de Poleas', muscle_group: 'Pecho', equipment: 'machine' },
    { id: ids.exercises.latRaisesCable, name: 'Elevaciones Laterales en Polea', muscle_group: 'Hombros', equipment: 'cable' },
    { id: ids.exercises.skullcrushers, name: 'Press Francés / Rompecráneos', muscle_group: 'Tríceps', equipment: 'barbell' },
    { id: ids.exercises.tricepExtUni, name: 'Extensión Tríceps Unilateral', muscle_group: 'Tríceps', equipment: 'cable' },

    // PULL B
    { id: ids.exercises.latPulldown, name: 'Jalón al Pecho', muscle_group: 'Espalda', equipment: 'cable' },
    { id: ids.exercises.machineRow, name: 'Remo en Máquina (Unilateral)', muscle_group: 'Espalda', equipment: 'machine' },
    { id: ids.exercises.pullover, name: 'Pullover en Polea Alta', muscle_group: 'Espalda', equipment: 'cable' },
    { id: ids.exercises.reverseFly, name: 'Pájaros (Posterior)', muscle_group: 'Hombros', equipment: 'dumbbell' },
    { id: ids.exercises.preacherCurl, name: 'Curl Predicador', muscle_group: 'Bíceps', equipment: 'machine' },
    { id: ids.exercises.hammerCurl, name: 'Curl Martillo', muscle_group: 'Bíceps', equipment: 'dumbbell' },

    // LEGS B
    { id: ids.exercises.hackSquat, name: 'Hack Squat', muscle_group: 'Piernas', equipment: 'machine' },
    { id: ids.exercises.lunges, name: 'Zancadas (Walking Lunges)', muscle_group: 'Piernas', equipment: 'dumbbell' },
    { id: ids.exercises.legExt, name: 'Extensión de Cuádriceps', muscle_group: 'Piernas', equipment: 'machine' },
    { id: ids.exercises.seatedLegCurl, name: 'Curl Femoral Sentado', muscle_group: 'Piernas', equipment: 'machine' },
    { id: ids.exercises.seatedCalf, name: 'Gemelos Sentado', muscle_group: 'Piernas', equipment: 'machine' },
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
    // PUSH A
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.benchPress, order_index: 0, target_sets: 3, target_reps: '6-8', notes: 'Clave: Baja la barra controlando el peso, sube explosivo.' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.inclineDbPress, order_index: 1, target_sets: 3, target_reps: '8-10', notes: 'Smart Fit tip: Si las bancas están llenas, usa la máquina de Chest Press Inclinado.' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.overheadPress, order_index: 2, target_sets: 3, target_reps: '8-10' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.latRaises, order_index: 3, target_sets: 4, target_reps: '12-15', notes: 'Clave: Controla la bajada. No uses impulso.' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.dips, order_index: 4, target_sets: 3, target_reps: '8-10' },
    { id: generateId(), routine_id: ids.routines.pushA, exercise_id: ids.exercises.tricepPushdown, order_index: 5, target_sets: 3, target_reps: '12-15' },

    // PULL A
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.pullups, order_index: 0, target_sets: 4, target_reps: '6-10', notes: 'Dominadas o Jalón al pecho abierto' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.barbellRow, order_index: 1, target_sets: 3, target_reps: '8-10', notes: 'Smart Fit tip: La máquina de remo con apoyo en el pecho es mejor para proteger tu lumbar' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.seatedRow, order_index: 2, target_sets: 3, target_reps: '10-12', notes: 'Agarre estrecho' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.facePull, order_index: 3, target_sets: 3, target_reps: '15', notes: 'Clave: Tira la cuerda hacia tu frente, abriendo los codos.' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.barbellCurl, order_index: 4, target_sets: 3, target_reps: '8-10' },
    { id: generateId(), routine_id: ids.routines.pullA, exercise_id: ids.exercises.inclineCurl, order_index: 5, target_sets: 2, target_reps: '10-12', notes: 'Nota: Siéntate en banco inclinado, deja caer los brazos muertos y sube sin mover codos.' },

    // LEGS A
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.squat, order_index: 0, target_sets: 3, target_reps: '6-8', notes: 'Mi ajuste: Si sientes molestias, vete a Hack Squat.' },
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.rdl, order_index: 1, target_sets: 3, target_reps: '8-10', notes: 'Clave: Baja solo hasta que sientas el "tirón" en el femoral.' },
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.legPress, order_index: 2, target_sets: 3, target_reps: '10-12', notes: '45 grados' },
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.legCurl, order_index: 3, target_sets: 3, target_reps: '10-12' },
    { id: generateId(), routine_id: ids.routines.legsA, exercise_id: ids.exercises.calfRaises, order_index: 4, target_sets: 4, target_reps: '15' },

    // PUSH B
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.inclineBench, order_index: 0, target_sets: 3, target_reps: '8-10', notes: 'Multipower te da estabilidad para enfocar el pecho alto.' },
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.peckDeck, order_index: 1, target_sets: 3, target_reps: '12-15', notes: 'O cruce de poleas' },
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.latRaisesCable, order_index: 2, target_sets: 4, target_reps: '15', notes: 'Mantén tensión constante.' },
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.skullcrushers, order_index: 3, target_sets: 3, target_reps: '10-12' },
    { id: generateId(), routine_id: ids.routines.pushB, exercise_id: ids.exercises.tricepExtUni, order_index: 4, target_sets: 3, target_reps: '12-15', notes: 'Para corregir asimetrías.' },

    // PULL B
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.latPulldown, order_index: 0, target_sets: 3, target_reps: '10-12', notes: 'Agarre Neutro/Triángulo' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.machineRow, order_index: 1, target_sets: 3, target_reps: '10-12', notes: 'Unilateral si es posible' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.pullover, order_index: 2, target_sets: 3, target_reps: '12-15', notes: 'Conecta mente-músculo con dorsales.' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.reverseFly, order_index: 3, target_sets: 4, target_reps: '15-20' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.preacherCurl, order_index: 4, target_sets: 3, target_reps: '10-12' },
    { id: generateId(), routine_id: ids.routines.pullB, exercise_id: ids.exercises.hammerCurl, order_index: 5, target_sets: 3, target_reps: '10-12' },

    // LEGS B
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.hackSquat, order_index: 0, target_sets: 3, target_reps: '8-12', notes: 'Baja profundo. O Sentadilla Goblet.' },
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.lunges, order_index: 1, target_sets: 3, target_reps: '10 pasos', notes: 'Usa mancuernas en las manos.' },
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.legExt, order_index: 2, target_sets: 3, target_reps: '12-15 + Drop', notes: 'Drop set al final: baja peso 50% y al fallo.' },
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.seatedLegCurl, order_index: 3, target_sets: 3, target_reps: '12-15' },
    { id: generateId(), routine_id: ids.routines.legsB, exercise_id: ids.exercises.seatedCalf, order_index: 4, target_sets: 4, target_reps: '15-20' },
];
