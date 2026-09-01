import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { useWorkoutStore } from '../../store/workoutStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Filled when focused, outlined otherwise — the standard iOS/Android tab idiom. */
function TabIcon({ name, focused, color, size }: { name: string; focused: boolean; color: string; size: number }) {
    const iconName = (focused ? name : `${name}-outline`) as IoniconName;
    return <Ionicons name={iconName} size={size} color={color} />;
}

export default function TabLayout() {
    // A workout can be running while the user browses other tabs; the dot makes
    // that obvious instead of leaving the session silently in the background.
    const isWorkoutActive = useWorkoutStore((state) => state.isActive);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                // Without these the default light tab bar sat under a dark app.
                tabBarActiveTintColor: COLORS.primaryLight,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarStyle: {
                    // The bar sits on the page colour, separated by a hairline,
                    // so it reads as an edge of the surface rather than a slab.
                    backgroundColor: COLORS.background,
                    borderTopColor: COLORS.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                },
                tabBarLabelStyle: {
                    fontFamily: FONTS.medium,
                    fontSize: 10,
                    letterSpacing: 0.6,
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Inicio',
                    tabBarIcon: (props) => <TabIcon name="home" {...props} />,
                }}
            />
            <Tabs.Screen
                name="workout"
                options={{
                    title: 'Entrenar',
                    tabBarIcon: ({ focused, color, size }) => (
                        <View>
                            <Ionicons name="barbell" size={size} color={color} />
                            {isWorkoutActive && !focused && <View style={styles.activeDot} />}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="routines"
                options={{
                    title: 'Rutinas',
                    tabBarIcon: (props) => <TabIcon name="list" {...props} />,
                }}
            />
            <Tabs.Screen
                name="exercises"
                options={{
                    title: 'Ejercicios',
                    tabBarIcon: (props) => <TabIcon name="albums" {...props} />,
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: 'Progreso',
                    tabBarIcon: (props) => <TabIcon name="stats-chart" {...props} />,
                }}
            />
            {/* Reached from the Progreso header, not a tab of its own. */}
            <Tabs.Screen name="calendar" options={{ href: null, title: 'Calendario' }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    activeDot: {
        position: 'absolute',
        top: -2,
        right: -4,
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: COLORS.error,
        borderWidth: 1.5,
        borderColor: COLORS.background,
    },
});
