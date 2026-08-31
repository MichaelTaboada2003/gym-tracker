import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Re-runs `refetch` every time the screen comes back into focus, skipping the
 * first focus (the hook that owns the data already loads on mount).
 *
 * Without this, finishing a workout left stale numbers on Inicio and Progreso,
 * and a routine created in one tab did not appear in the picker in another.
 */
export function useRefreshOnFocus(refetch: () => void | Promise<unknown>) {
    const isFirstFocus = useRef(true);

    useFocusEffect(
        useCallback(() => {
            if (isFirstFocus.current) {
                isFirstFocus.current = false;
                return;
            }
            void refetch();
        }, [refetch])
    );
}
