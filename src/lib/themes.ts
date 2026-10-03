export type ColorMode = 'light' | 'dark';

export const DEFAULT_COLOR_MODE: ColorMode = 'light';
export function getColorModeStorageKey(userId: string | null): string {
	return `vex-color-mode:${userId ?? 'anonymous'}`;
}
