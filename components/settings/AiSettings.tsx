import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Button } from '../ui/Button';
import { checkHealth, getEndpoint, isConfigured } from '../../lib/ai/client';

type Health = 'unknown' | 'checking' | 'ok' | 'down';

/**
 * Diagnóstico del servicio de análisis.
 *
 * Ya no hay nada que configurar: la API key vive en el Worker de Cloudflare, no
 * en el dispositivo. Esta sección solo existe para responder a la pregunta que
 * surge cuando el análisis falla — ¿es el servicio o son mis datos?
 */
export function AiSettings() {
    const [health, setHealth] = useState<Health>('unknown');
    const configured = isConfigured();
    const endpoint = getEndpoint();

    const test = useCallback(async () => {
        setHealth('checking');
        setHealth((await checkHealth()) ? 'ok' : 'down');
    }, []);

    useEffect(() => {
        if (configured) void test();
    }, [configured, test]);

    if (!configured) {
        return (
            <View style={styles.card}>
                <Text style={styles.help}>
                    Esta versión se compiló sin servicio de análisis. Define{' '}
                    <Text style={styles.code}>EXPO_PUBLIC_ANALYSIS_URL</Text> y vuelve a compilar.
                </Text>
            </View>
        );
    }

    const status = {
        unknown: { icon: 'ellipse-outline' as const, color: COLORS.textMuted, label: 'Sin comprobar' },
        checking: { icon: 'sync-outline' as const, color: COLORS.textMuted, label: 'Comprobando…' },
        ok: { icon: 'checkmark-circle' as const, color: COLORS.success, label: 'Disponible' },
        down: { icon: 'alert-circle' as const, color: COLORS.error, label: 'No responde' },
    }[health];

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Ionicons name={status.icon} size={18} color={status.color} />
                <View style={styles.body}>
                    <Text style={styles.label}>Servicio de análisis</Text>
                    <Text style={styles.value} numberOfLines={1}>
                        {status.label}
                    </Text>
                </View>
                <Button
                    title="Probar"
                    variant="secondary"
                    size="sm"
                    loading={health === 'checking'}
                    onPress={test}
                />
            </View>

            <Text style={styles.help}>
                Tu clave no está en la app: las peticiones pasan por tu propio servidor.
            </Text>
            <Text style={styles.endpoint} numberOfLines={1}>
                {endpoint}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    body: {
        flex: 1,
    },
    label: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    value: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    help: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.xs,
        lineHeight: 18,
        color: COLORS.textMuted,
    },
    code: {
        fontFamily: 'monospace',
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    endpoint: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: COLORS.textMuted,
    },
});
