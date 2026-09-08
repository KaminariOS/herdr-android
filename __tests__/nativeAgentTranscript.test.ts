import type { NativeAgentTranscriptState } from 'react-native-whip-ssh';

import { agentChatStateFromNative, applyNativeAgentTranscriptUpdate } from '../src/lib/nativeAgentTranscript';

test('keeps normalized native tool fields typed through the presentation boundary', () => {
  const tool = {
    type: 'tool' as const,
    id: 'tool:1',
    callId: 'call:1',
    tool: 'patch',
    state: {
      status: 'completed' as const,
      input: { path: 'src/main.rs' },
      files: [{
        file: 'src/main.rs',
        patch: '@@ -1 +1 @@\n-old\n+new',
        additions: 1,
        deletions: 1,
      }],
      diagnostics: [{
        file: 'src/main.rs',
        line: 5,
        column: 9,
        message: 'expected `;`',
        severity: 'error' as const,
      }],
      loaded: ['AGENTS.md'],
      exitCode: 0,
    },
  };
  const native: NativeAgentTranscriptState = {
    sessionId: 'session-1',
    agent: 'opencode',
    revision: 1,
    status: 'live',
    messages: [{
      id: 'assistant:1',
      role: 'assistant',
      parts: [tool],
      diffs: tool.state.files,
    }],
    turns: [{
      id: 'turn:1',
      assistantMessageIds: ['assistant:1'],
      status: 'idle',
      diffs: tool.state.files,
    }],
  };

  const state = agentChatStateFromNative(native);
  const part = state.transcript.messages[0].parts[0];

  expect(part).toBe(tool);
  expect(part).toMatchObject({
    type: 'tool',
    state: {
      input: { path: 'src/main.rs' },
      files: [{ file: 'src/main.rs', additions: 1, deletions: 1 }],
      diagnostics: [{ file: 'src/main.rs', line: 5, column: 9 }],
      loaded: ['AGENTS.md'],
      exitCode: 0,
    },
  });
  expect(state.transcript.turns[0].assistants[0]).toBe(native.messages[0]);
});

test('preserves a closed native transcript as a recoverable terminal state', () => {
  const native: NativeAgentTranscriptState = {
    sessionId: 'session-closed',
    agent: 'codex',
    revision: 2,
    status: 'closed',
    messages: [],
    turns: [],
  };

  expect(agentChatStateFromNative(native).status).toBe('closed');
});

test('keeps Codex turns 1 through 100 available after incremental native updates', () => {
  let state = agentChatStateFromNative({
    sessionId: 'codex-history', agent: 'codex', revision: 0, status: 'live',
    messages: [], turns: [],
  });
  for (let index = 0; index < 100; index += 1) {
    const number = index + 1;
    const message = {
      id: `user-${number}`, role: 'user' as const,
      parts: [{ type: 'text' as const, id: `text-${number}`, text: `question ${number}` }],
      diffs: [],
    };
    const next = applyNativeAgentTranscriptUpdate(state, {
      key: "host\ncodex\ncodex-history", runtimeIncarnation: 1, revision: number,
      deltas: [
        { type: 'message-upserted', index, message },
        { type: 'turn-upserted', index, turn: {
          id: `turn-${number}`, userMessageId: message.id,
          assistantMessageIds: [], status: 'idle', diffs: [],
        } },
      ],
    });
    expect(next).not.toBeNull();
    state = next!;
    expect(state.transcript.turns).toHaveLength(number);
  }
  expect(state.transcript.turns.map(turn => ({ id: turn.id, text: turn.user?.parts[0] })))
    .toEqual(Array.from({ length: 100 }, (_value, index) => ({
      id: `turn-${index + 1}`,
      text: { type: 'text', id: `text-${index + 1}`, text: `question ${index + 1}` },
    })));
});
