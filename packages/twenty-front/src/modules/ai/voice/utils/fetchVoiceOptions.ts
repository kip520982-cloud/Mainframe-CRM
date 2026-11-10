import { REST_API_BASE_URL } from '@/apollo/constants/RestApiBaseUrl';
import { SESSION_COOKIE_OPT_IN_HEADER_NAME } from 'twenty-shared/constants';

import { type VoiceOption } from '@/ai/voice/types/VoiceOption';

const SESSION_COOKIE_HEADERS = {
  [SESSION_COOKIE_OPT_IN_HEADER_NAME]: '1',
};

let cachedVoiceOptions: VoiceOption[] | null = null;

export const fetchVoiceOptions = async (): Promise<VoiceOption[]> => {
  if (cachedVoiceOptions !== null) {
    return cachedVoiceOptions;
  }

  const response = await fetch(`${REST_API_BASE_URL}/voice/voices`, {
    credentials: 'include',
    headers: SESSION_COOKIE_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Voice list request failed: ${response.status}`);
  }

  const result = (await response.json()) as { voices: VoiceOption[] };
  cachedVoiceOptions = result.voices;

  return cachedVoiceOptions;
};
