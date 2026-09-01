import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { Button } from '../ui/Button';
import {
    DEFAULT_MODEL,
    GroqError,
    GroqModel,
    getApiKey,
    listModels,
    resolveModel,
    setApiKey,
    setModel,
} from '../../lib/ai/groq';
import { showAlert, showConfirm } from '../../lib/dialog';

const CONSOLE_URL = 'https://console.groq.com/keys';

/** Never render a secret in full; enough to recognise it, not to read it. */
function maskKey(key: string): string {
    if (key.length <= 10) return '••••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

/**
 * Groq configuration.
 *
 * The key lives in AsyncStorage on the device, not in `.env`: an
 * `EXPO_PUBLIC_*` variable is inlined into the shipped JS bundle, so anyone with
 * the app file could read it. This also keeps it out of the repository.
 */
export function AiSettings() {
    const [storedKey, setStoredKey] = useState<string | null>(null);
    const [draftKey, setDraftKey] = useState('');
    const [editing, setEditing] = useState(false);
    const [model, setSelectedModel] = useState(DEFAULT_MODEL);
    const [models, setModels] = useState<GroqModel[]>([]);
    const [checking, setChecking] = useState(false);

    const load = useCallback(async () => {
        const key = await getApiKey();
        // Resolving also records the account's best model on first run.
        const current = key ? await resolveModel() : DEFAULT_MODEL;
        setStoredKey(key);
        setSelectedModel(current);
        setEditing(!key);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    /**
     * Saving and validating are the same action: listing models both proves the
     * key works and fills the picker, so there is no way to save a dead key and
     * only find out at the end of a workout.
     */
    const saveAndVerify = async () => {
        const candidate = draftKey.trim();
        if (!candidate) {
            showAlert('Falta la key', 'Pega tu API key de Groq para continuar.');
            return;
        }

        setChecking(true);
        try {
            await setApiKey(candidate);
            const available = await listModels();
            setModels(available);
            setStoredKey(candidate);
            setDraftKey('');
            setEditing(false);

            // Keep the saved model only if the account can actually use it.
            if (available.length > 0 && !available.some((m) => m.id === model)) {
                const fallback = available.find((m) => m.id === DEFAULT_MODEL) ?? available[0];
                await setModel(fallback.id);
                setSelectedModel(fallback.id);
            }

            showAlert('Key guardada', `${available.length} modelos disponibles en tu cuenta.`);
        } catch (error) {
            await setApiKey(''); // Do not keep a key that does not work.
            setStoredKey(null);
            showAlert(
                'No se pudo verificar',
                error instanceof GroqError ? error.message : 'Revisa la key e inténtalo de nuevo.'
            );
        } finally {
            setChecking(false);
        }
    };

    const loadModels = async () => {
        setChecking(true);
        try {
            setModels(await listModels());
        } catch (error) {
            showAlert('Error', error instanceof GroqError ? error.message : 'No se pudieron cargar los modelos.');
        } finally {
            setChecking(false);
        }
    };

    const removeKey = () => {
        showConfirm({
            title: 'Quitar la API key',
            message: 'El análisis dejará de estar disponible. Los análisis ya guardados se conservan.',
            confirmLabel: 'Quitar',
            onConfirm: async () => {
                await setApiKey('');
                setStoredKey(null);
                setModels([]);
                setEditing(true);
            },
        });
    };

    return (
        <View style={styles.card}>
            {storedKey && !editing ? (
                <>
                    <View style={styles.row}>
                        <View style={styles.rowBody}>
                            <Text style={styles.rowLabel}>API key de Groq</Text>
                            <Text style={styles.rowValue}>{maskKey(storedKey)}</Text>
                        </View>
                        <Pressable onPress={() => setEditing(true)} style={styles.textButton}>
                            <Text style={styles.textButtonLabel}>Cambiar</Text>
                        </Pressable>
                        <Pressable onPress={removeKey} style={styles.textButton}>
                            <Text style={[styles.textButtonLabel, styles.destructive]}>Quitar</Text>
                        </Pressable>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.modelBlock}>
                        <View style={styles.rowBody}>
                            <Text style={styles.rowLabel}>Modelo</Text>
                            <Text style={styles.rowValue}>{model}</Text>
                        </View>

                        {models.length === 0 ? (
                            <Button
                                title={checking ? 'Cargando…' : 'Ver modelos disponibles'}
                                variant="secondary"
                                size="sm"
                                loading={checking}
                                onPress={loadModels}
                            />
                        ) : (
                            <View style={styles.modelList}>
                                {models.map((option) => {
                                    const active = option.id === model;
                                    return (
                                        <Pressable
                                            key={option.id}
                                            onPress={async () => {
                                                await setModel(option.id);
                                                setSelectedModel(option.id);
                                            }}
                                            style={[styles.modelChip, active && styles.modelChipActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.modelChipText,
                                                    active && styles.modelChipTextActive,
                                                ]}
                                            >
                                                {option.id}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </>
            ) : (
                <View style={styles.setup}>
                    <Text style={styles.help}>
                        La key se guarda solo en este dispositivo y las peticiones van directas a Groq.
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={draftKey}
                        onChangeText={setDraftKey}
                        placeholder="gsk_…"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                        editable={!checking}
                    />

                    <View style={styles.setupActions}>
                        <Button
                            title={checking ? 'Verificando…' : 'Guardar y verificar'}
                            onPress={saveAndVerify}
                            loading={checking}
                            size="sm"
                        />
                        {storedKey ? (
                            <Button
                                title="Cancelar"
                                variant="ghost"
                                size="sm"
                                onPress={() => {
                                    setDraftKey('');
                                    setEditing(false);
                                }}
                            />
                        ) : null}
                    </View>

                    <Pressable
                        onPress={() => Linking.openURL(CONSOLE_URL)}
                        style={styles.link}
                        accessibilityRole="link"
                    >
                        <Ionicons name="open-outline" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.linkText}>Conseguir una key en console.groq.com</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    rowBody: {
        flex: 1,
    },
    rowLabel: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    rowValue: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    textButton: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
    },
    textButtonLabel: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    destructive: {
        color: COLORS.error,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.surfaceHighlight,
    },
    modelBlock: {
        paddingVertical: SPACING.md,
        gap: SPACING.sm,
    },
    modelList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    modelChip: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surfaceLight,
    },
    modelChipActive: {
        backgroundColor: COLORS.primary,
    },
    modelChipText: {
        fontFamily: FONTS.medium,
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    modelChipTextActive: {
        color: COLORS.onChalk,
    },
    setup: {
        paddingVertical: SPACING.md,
        gap: SPACING.sm,
    },
    help: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.xs,
        lineHeight: 18,
        color: COLORS.textMuted,
    },
    input: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    setupActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingTop: SPACING.xs,
    },
    linkText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
});
