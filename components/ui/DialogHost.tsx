import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { DialogAction, useDialogStore } from '../../lib/dialog';

/**
 * Renders whatever `showDialog` requests. Mounted once, in the root layout.
 *
 * Laid out as a bottom sheet rather than a centred box: during a workout the
 * phone is held one-handed, and these actions need to sit under the thumb.
 * Unlike Android's native dialog it takes any number of actions.
 */
export function DialogHost() {
    const request = useDialogStore((state) => state.request);
    const dismiss = useDialogStore((state) => state.dismiss);
    const insets = useSafeAreaInsets();

    if (!request) return null;

    // Cancel always sits apart at the bottom, whatever order it was declared in.
    const cancel = request.actions.find((action) => action.style === 'cancel');
    const primary = request.actions.filter((action) => action.style !== 'cancel');

    const run = (action: DialogAction) => {
        dismiss();
        action.onPress?.();
    };

    return (
        <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
            <Pressable style={styles.backdrop} onPress={dismiss} accessibilityLabel="Cerrar">
                {/* Stops taps inside the sheet from dismissing it. */}
                <Pressable
                    style={[styles.sheet, { marginBottom: Math.max(insets.bottom, SPACING.md) }]}
                    onPress={() => undefined}
                >
                    <View style={styles.card}>
                        <View style={styles.headerBlock}>
                            <Text style={styles.title}>{request.title}</Text>
                            {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
                        </View>

                        <ScrollView bounces={false} style={styles.actionsScroll}>
                            {primary.map((action, index) => (
                                <Pressable
                                    key={`${action.label}-${index}`}
                                    onPress={() => run(action)}
                                    accessibilityRole="button"
                                    style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                                >
                                    <Text
                                        style={[
                                            styles.actionLabel,
                                            action.style === 'destructive' && styles.actionDestructive,
                                        ]}
                                    >
                                        {action.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    <Pressable
                        onPress={() => (cancel ? run(cancel) : dismiss())}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.cancelCard, pressed && styles.actionPressed]}
                    >
                        <Text style={styles.cancelLabel}>{cancel?.label ?? 'Cancelar'}</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: COLORS.overlay.dark,
        justifyContent: 'flex-end',
    },
    sheet: {
        marginHorizontal: SPACING.sm,
        gap: SPACING.sm,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    headerBlock: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.md,
        gap: 4,
    },
    title: {
        fontFamily: FONTS.display,
        fontSize: 22,
        lineHeight: 24,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    message: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    actionsScroll: {
        maxHeight: 380,
    },
    action: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.surfaceHighlight,
        alignItems: 'center',
    },
    actionPressed: {
        backgroundColor: COLORS.surfaceLight,
    },
    actionLabel: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    actionDestructive: {
        color: COLORS.error,
    },
    cancelCard: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    cancelLabel: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
});
