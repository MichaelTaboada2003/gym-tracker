export const COLORS = {
    // Primary palette
    primary: '#6366F1', // Indigo-500
    primaryLight: '#818CF8', // Indigo-400
    primaryDark: '#4F46E5', // Indigo-600

    // Secondary/Accent palette (Teal/Cyan for vibrant contrasts)
    secondary: '#14B8A6', // Teal-500
    secondaryLight: '#2DD4BF', // Teal-400
    secondaryDark: '#0D9488', // Teal-600

    // Functional colors
    success: '#10B981', // Emerald-500
    warning: '#F59E0B', // Amber-500
    error: '#EF4444', // Red-500
    info: '#3B82F6', // Blue-500

    // Neutral palette (Premium Dark Theme)
    background: '#0F172A', // Slate-900 (Main bg)
    surface: '#1E293B', // Slate-800 (Cards)
    surfaceLight: '#334155', // Slate-700 (Hover/Deep cards)
    surfaceHighlight: '#475569', // Slate-600 (Borders/Dividers)

    // Text colors
    textPrimary: '#F1F5F9', // Slate-100
    textSecondary: '#94A3B8', // Slate-400
    textMuted: '#64748B', // Slate-500
    textHighlight: '#E2E8F0', // Slate-200

    // Muscle group colors (Vibrant)
    chest: '#F87171', // Red-400
    back: '#60A5FA', // Blue-400
    shoulders: '#FBBF24', // Amber-400
    arms: '#34D399', // Emerald-400
    legs: '#A78BFA', // Violet-400
    core: '#FB923C', // Orange-400
    cardio: '#F472B6', // Pink-400

    // Gradients & Overlays
    gradients: {
        primary: ['#6366F1', '#818CF8'] as const,
        secondary: ['#14B8A6', '#2DD4BF'] as const,
        dark: ['#1E293B', '#0F172A'] as const,
        glass: ['rgba(30, 41, 59, 0.7)', 'rgba(30, 41, 59, 0.3)'] as const,
        success: ['#10B981', '#34D399'] as const,
        fire: ['#F59E0B', '#EF4444'] as const,
    },

    overlay: {
        light: 'rgba(255, 255, 255, 0.05)',
        medium: 'rgba(255, 255, 255, 0.1)',
        dark: 'rgba(0, 0, 0, 0.4)',
    },

    border: '#334155', // Slate-700
} as const;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export const FONT_SIZES = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
} as const;

export const BORDER_RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
} as const;
