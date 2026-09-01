import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Imported per weight, not from the package root: the root index re-exports all
// 18 cuts (plus italics), and Metro would bundle every one of them — ~3.5 MB of
// fonts for the six the type system actually uses.
import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { COLORS, FONT_SIZES, SPACING } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { initializeDatabase } from '../lib/localDatabase';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

type InitState = { status: 'loading' } | { status: 'ready' } | { status: 'failed'; error: string };

export default function RootLayout() {
    const [init, setInit] = useState<InitState>({ status: 'loading' });

    const [fontsLoaded, fontError] = useFonts({
        Barlow_400Regular,
        Barlow_500Medium,
        Barlow_600SemiBold,
        Barlow_700Bold,
        BarlowCondensed_600SemiBold,
        BarlowCondensed_700Bold,
    });

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
                    seeding and migrations have finished. Type is gated too: a
                    flash of system font ahead of Barlow reflows every screen.
                    A font that fails to download is not worth blocking on. */}
                {init.status === 'loading' || (!fontsLoaded && !fontError) ? (
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
                                headerTitleStyle: { fontFamily: FONTS.semibold },
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
        fontFamily: FONTS.bold,
        textAlign: 'center',
    },
    errorDetail: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
    },
});
