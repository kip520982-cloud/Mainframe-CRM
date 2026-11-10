const VOICE_MODE_STORAGE_KEY = 'ai-voice-mode-enabled';
const VOICE_SELECTION_STORAGE_KEY = 'ai-voice-selection';

export const readVoiceModeEnabledFromStorage = (): boolean => {
  try {
    return localStorage.getItem(VOICE_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const readVoiceSelectionFromStorage = (): string | null => {
  try {
    return localStorage.getItem(VOICE_SELECTION_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const writeVoiceModeEnabledToStorage = (value: boolean) => {
  try {
    localStorage.setItem(VOICE_MODE_STORAGE_KEY, String(value));
  } catch {
    // storage unavailable (private mode, quota): voice mode just won't persist
  }
};

export const writeVoiceSelectionToStorage = (value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(VOICE_SELECTION_STORAGE_KEY);
    } else {
      localStorage.setItem(VOICE_SELECTION_STORAGE_KEY, value);
    }
  } catch {
    // same as above
  }
};
