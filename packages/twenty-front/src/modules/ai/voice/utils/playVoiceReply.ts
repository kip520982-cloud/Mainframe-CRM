import { REST_API_BASE_URL } from '@/apollo/constants/RestApiBaseUrl';
import { SESSION_COOKIE_OPT_IN_HEADER_NAME } from 'twenty-shared/constants';

const SESSION_COOKIE_HEADERS = {
  [SESSION_COOKIE_OPT_IN_HEADER_NAME]: '1',
};

let currentAudio: HTMLAudioElement | null = null;

export const stopVoicePlayback = () => {
  currentAudio?.pause();
  currentAudio = null;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

const pickBrowserVoice = (): SpeechSynthesisVoice | null => {
  if (!('speechSynthesis' in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const byLanguage = (prefix: string) =>
    voices.find((voice) =>
      voice.lang.replace('_', '-').toLowerCase().startsWith(prefix),
    );

  return byLanguage('en-nz') ?? byLanguage('en-au') ?? null;
};

// browser speech synthesis: the $0 fallback while the Fish account has no credit
const speakWithBrowser = (text: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const voice = pickBrowserVoice();

    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser speech synthesis unavailable'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Browser speech failed'));
    window.speechSynthesis.speak(utterance);
  });

export const playVoiceReply = async ({
  text,
  voiceId,
}: {
  text: string;
  voiceId?: string;
}): Promise<void> => {
  const trimmedText = text.slice(0, 3000);

  try {
    const response = await fetch(`${REST_API_BASE_URL}/voice/speak`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...SESSION_COOKIE_HEADERS,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: trimmedText, voiceId }),
    });

    if (!response.ok) {
      throw new Error(`Voice request failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    stopVoicePlayback();

    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) {
          currentAudio = null;
        }
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Voice playback failed'));
      };
      void audio.play().catch(reject);
    });
  } catch {
    await speakWithBrowser(trimmedText);
  }
};
