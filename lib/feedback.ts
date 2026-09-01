/**
 * Physical feedback: haptics and keeping the screen awake.
 *
 * Both are conveniences layered on top of the workout, and both can reject —
 * haptics on devices without a taptic engine, wake lock when the page or app
 * is not foregrounded. `void somePromise()` does *not* swallow a rejection, so
 * calling them bare produced unhandled rejections (a full-screen error overlay
 * on web). Everything here fails silently by design: nothing about logging a
 * set should depend on the phone being able to buzz.
 */

import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const ignore = () => undefined;

/** Light tap: undoing something, adjusting a value. */
export function tapLight(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
}

/** Medium tap: completing a set — the app's core gesture. */
export function tapMedium(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore);
}

/** Success pattern: workout saved, rest finished. */
export function notifySuccess(): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
}

export function keepAwake(tag: string): void {
    activateKeepAwakeAsync(tag).catch(ignore);
}

export function releaseKeepAwake(tag: string): void {
    Promise.resolve(deactivateKeepAwake(tag)).catch(ignore);
}
