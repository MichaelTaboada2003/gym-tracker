/**
 * Imperative dialogs that actually work on every platform.
 *
 * `Alert.alert` was used throughout the app and has two disqualifying problems:
 *
 * - **On web it is a no-op.** `react-native-web` ships `class Alert { static
 *   alert() {} }`, so every confirmation and menu silently did nothing.
 * - **On Android it caps at three buttons.** The native `AlertDialog` has only
 *   positive/negative/neutral slots, so a five-action menu quietly lost its last
 *   two entries — including "Eliminar" and "Cancelar".
 *
 * The API mirrors `Alert.alert` closely so call sites read the same, but it is
 * backed by a React modal rendered by `<DialogHost />` in the root layout.
 */

import { create } from 'zustand';

export type DialogActionStyle = 'default' | 'destructive' | 'cancel';

export interface DialogAction {
    label: string;
    onPress?: () => void;
    style?: DialogActionStyle;
}

export interface DialogRequest {
    title: string;
    message?: string;
    /** Rendered in order. `cancel` actions are pulled out and shown last. */
    actions: DialogAction[];
}

interface DialogState {
    request: DialogRequest | null;
    show: (request: DialogRequest) => void;
    dismiss: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
    request: null,
    show: (request) => set({ request }),
    dismiss: () => set({ request: null }),
}));

/** Opens a dialog. Callable from anywhere — no hook, no prop drilling. */
export function showDialog(request: DialogRequest): void {
    useDialogStore.getState().show(request);
}

/** A message with a single "Entendido" acknowledgement. */
export function showAlert(title: string, message?: string): void {
    showDialog({ title, message, actions: [{ label: 'Entendido', style: 'cancel' }] });
}

/**
 * Yes/no confirmation. `destructive` tints the confirm action and is the
 * default, since almost every confirmation in this app guards a deletion.
 */
export function showConfirm(options: {
    title: string;
    message?: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
}): void {
    showDialog({
        title: options.title,
        message: options.message,
        actions: [
            {
                label: options.confirmLabel,
                style: options.destructive === false ? 'default' : 'destructive',
                onPress: options.onConfirm,
            },
            { label: options.cancelLabel ?? 'Cancelar', style: 'cancel' },
        ],
    });
}
