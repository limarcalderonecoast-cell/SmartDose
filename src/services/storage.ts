import { AppState } from '../types';

const STORAGE_KEY = 'smartdose::app-state';

export async function loadAppState(): Promise<AppState | null> {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as AppState;
  } catch (error) {
    console.warn('Unable to load SmartDose state.', error);
    return null;
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to save SmartDose state.', error);
  }
}
