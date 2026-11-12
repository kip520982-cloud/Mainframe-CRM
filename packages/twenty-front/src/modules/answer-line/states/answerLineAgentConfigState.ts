import {
  DEFAULT_ANSWER_LINE_AGENT_CONFIG,
  type AnswerLineAgentConfig,
} from '@/answer-line/types/AnswerLineAgentConfig';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { isPlainObject } from 'twenty-shared/utils';

const isValidConfig = (value: AnswerLineAgentConfig): boolean =>
  isPlainObject(value) &&
  typeof value.name === 'string' &&
  typeof value.agentId === 'string' &&
  typeof value.voice === 'string' &&
  typeof value.greeting === 'string' &&
  typeof value.instructions === 'string' &&
  typeof value.consoleUrl === 'string';

export const answerLineAgentConfigState =
  createAtomState<AnswerLineAgentConfig>({
    // key bump clears stale greeting-only / unstructured prompts from earlier localStorage
    key: 'answer-line/answerLineAgentConfigState.v4',
    defaultValue: DEFAULT_ANSWER_LINE_AGENT_CONFIG,
    useLocalStorage: true,
    localStorageOptions: { getOnInit: true },
    validateInitFn: isValidConfig,
  });
