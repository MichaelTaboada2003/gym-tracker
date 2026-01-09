import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { COLORS } from '../../constants/colors';

interface GradientTextProps {
    colors?: readonly [string, string, ...string[]];
    style?: TextStyle;
    children: React.ReactNode;
}

export function GradientText({
    colors = COLORS.gradients.primary,
    style,
    children,
}: GradientTextProps) {
    return (
        <MaskedView
            maskElement={
                <Text style={[style, { backgroundColor: 'transparent' }]}>
                    {children}
                </Text>
            }
        >
            <LinearGradient
                colors={colors as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Text style={[style, { opacity: 0 }]}>{children}</Text>
            </LinearGradient>
        </MaskedView>
    );
}
