import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

// Reusable tab icon with pop-out effect when focused
const TabIcon = ({
    name,
    focused,
    isCenter = false
}: {
    name: keyof typeof Ionicons.glyphMap;
    focused: boolean;
    isCenter?: boolean;
}) => {
    const size = isCenter ? 50 : 42;
    const iconSize = isCenter ? 26 : 22;
    const showElevated = focused; // Only elevate when focused

    return (
        <View style={{
            marginBottom: showElevated ? 20 : 0,
            backgroundColor: showElevated ? COLORS.primary : 'transparent',
            width: showElevated ? size : 40,
            height: showElevated ? size : 40,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: showElevated ? COLORS.primary : 'transparent',
            shadowOffset: { width: 0, height: showElevated ? 4 : 0 },
            shadowOpacity: showElevated ? 0.4 : 0,
            shadowRadius: showElevated ? 8 : 0,
            elevation: showElevated ? 6 : 0,
            borderWidth: showElevated ? 2 : 0,
            borderColor: COLORS.background,
        }}>
            <Ionicons
                name={name}
                size={iconSize}
                color={showElevated ? "#FFF" : COLORS.textMuted}
            />
        </View>
    );
};

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopColor: COLORS.surfaceHighlight,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: COLORS.primaryLight,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                },
                tabBarBackground: () => (
                    <View style={StyleSheet.absoluteFill}>
                        <LinearGradient
                            colors={[COLORS.surface, COLORS.background]}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                ),
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Inicio',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            name={focused ? "home" : "home-outline"}
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="workout"
                options={{
                    title: 'Entrenar',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            name="barbell"
                            focused={focused}
                            isCenter
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="routines"
                options={{
                    title: 'Rutinas',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            name={focused ? "list" : "list-outline"}
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="exercises"
                options={{
                    title: 'Ejercicios',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            name={focused ? "fitness" : "fitness-outline"}
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    href: null,
                    title: 'Calendario',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            name={focused ? "calendar" : "calendar-outline"}
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: 'Progreso',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            name={focused ? "stats-chart" : "stats-chart-outline"}
                            focused={focused}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
