import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, SPACING } from '../constants/colors';
import { initializeDatabase } from '../lib/localDatabase';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

type InitState = { status: 'loading' } | { status: 'ready' } | { status: 'failed'; error: string };

export default function RootLayout() {
    const [init, setInit] = useState<InitState>({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;

        initializeDatabase()
            .then(() => !cancelled && setInit({ status: 'ready' }))
            .catch((error: unknown) => {
                if (cancelled) return;
                setInit({
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Error desconocido',
                });
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <SafeAreaProvider>
            <View style={styles.container}>
                <StatusBar style="light" />

                {/* Screens read from storage on mount, so nothing renders until
                    seeding and migrations have finished. */}
                {init.status === 'loading' ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : init.status === 'failed' ? (
                    <View style={styles.centered}>
                        <Text style={styles.errorTitle}>No se pudo abrir la base de datos</Text>
                        <Text style={styles.errorDetail}>{init.error}</Text>
                    </View>
                ) : (
                    <ErrorBoundary>
                        <Stack
                            screenOptions={{
                                headerStyle: { backgroundColor: COLORS.background },
                                headerTintColor: COLORS.textPrimary,
                                headerTitleStyle: { fontWeight: '600' },
                                contentStyle: { backgroundColor: COLORS.background },
                            }}
                        >
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="routine/[id]" options={{ headerShown: false }} />
                            <Stack.Screen name="plan/[id]" options={{ headerShown: false }} />
                            <Stack.Screen name="exercise/[id]" options={{ headerShown: false }} />
                            <Stack.Screen name="settings" options={{ headerShown: false }} />
                        </Stack>
                    </ErrorBoundary>
                )}
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
        padding: SPACING.xl,
    },
    errorTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        textAlign: 'center',
    },
    errorDetail: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
    },
});
