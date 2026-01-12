import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { COLORS } from '../constants/colors';
import { initializeDatabase } from '../lib/localDatabase';

export default function RootLayout() {
    const [dbReady, setDbReady] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                await initializeDatabase();
                setDbReady(true);
            } catch (error) {
                console.error('Failed to initialize database:', error);
                setDbError('Error al inicializar la base de datos local');
            }
        };
        init();
    }, []);

    if (dbError) {
        return (
            <View style={[styles.container, styles.center]}>
                <StatusBar style="light" />
                <Text style={styles.errorText}>{dbError}</Text>
            </View>
        );
    }

    if (!dbReady) {
        return (
            <View style={[styles.container, styles.center]}>
                <StatusBar style="light" />
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: COLORS.background,
                    },
                    headerTintColor: COLORS.textPrimary,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    contentStyle: {
                        backgroundColor: COLORS.background,
                    },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});
