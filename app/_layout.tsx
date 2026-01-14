import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { initializeDatabase, migrateRestTimes, migrateTimePerRep } from '../lib/localDatabase';

export default function RootLayout() {
    useEffect(() => {
        const init = async () => {
            await initializeDatabase();
            await migrateRestTimes();
            await migrateTimePerRep(); // Update time per rep for exercises
        };
        init();
    }, []);

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
});
