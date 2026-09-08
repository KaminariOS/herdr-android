import type { ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SessionScreen } from '../src/components/SessionScreen';
import { agentChatCache } from '../src/services/agentChatCache';
import { agentTranscriptService } from '../src/services/NativeTranscriptService';
import type { ChatAgent } from '../src/lib/agentChatSession';
import type { HerdrSnapshot, PaneInfo } from '../src/types';
import type {
  NativeAgentChatOpenResult,
  NativeAgentChatStartResult,
  RuntimeAgentIntegrationStatus,
} from 'react-native-whip-ssh';

jest.mock('react-native', () => ({
  View: 'View',
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'Spinner',
  NativeModules: {},
  Platform: { OS: 'android' },
  Linking: { openURL: jest.fn() },
}));
jest.mock('react-native-css-interop/jsx-runtime', () =>
  jest.requireActual('react/jsx-runtime'),
);
jest.mock('react-native-whip-ssh', () =>
  require('./mockWhipSsh').createMockWhipSshModule(),
);
jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => String(name) }),
);
jest.mock('react-native-webview', () => 'WebView');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../src/components/app-ui', () => ({
  AnimatedAgentStatusGlyph: 'AgentGlyph',
  hapticPress: (fn: unknown) => fn,
}));
jest.mock('../src/components/GlassSurface', () => ({
  useAppGlassEnabled: () => false,
}));
jest.mock('../src/components/TerminalScreen', () => ({
  TerminalScreen: 'TerminalScreen',
  TerminalBackground: 'TerminalBackground',
}));
jest.mock('../src/components/AgentChatView', () => ({
  AgentChatView: 'AgentChatView',
}));
jest.mock('../src/components/AgentIntegrationInstallSheet', () => ({
  AgentIntegrationInstallSheet: 'IntegrationSheet',
}));
jest.mock('../src/components/AgentIdentityWarningSheet', () => ({
  AgentIdentityWarningSheet: 'IdentitySheet',
}));
jest.mock('../src/components/AppAlertPopup', () => ({
  AppAlertPopup: 'Alert',
}));
jest.mock('../src/components/AppBackground', () => ({
  AppBackground: 'AppBackground',
}));
jest.mock('../src/components/AttachmentPasteSheet', () => ({
  AttachmentPasteSheet: 'AttachmentSheet',
}));
jest.mock('../src/components/ResourceEditorSheet', () => ({
  ResourceEditorSheet: 'EditorSheet',
  ResourceEditorField: 'EditorField',
}));
jest.mock('../src/components/ui/button', () => ({ Button: 'Button' }));
jest.mock('../src/components/ui/input', () => ({ Input: 'Input' }));
jest.mock('../src/components/ui/switch', () => ({ Switch: 'Switch' }));
jest.mock('../src/components/ui/text', () => ({ Text: 'Text' }));
jest.mock('../src/services/volumeKeys', () => ({
  addTerminalVolumeKeyListener: () => ({ remove: jest.fn() }),
}));
jest.mock('../src/theme', () => ({
  useTheme: () => ({ colors: {} }),
  sessionTabGlassStyle: () => ({}),
  sessionTabStatusColor: () => '',
  statusColor: () => '',
}));

type Props = ComponentProps<typeof SessionScreen>;
function setup(agent: ChatAgent) {
  const pane: PaneInfo = {
    pane_id: 'pane-1',
    terminal_id: 'terminal-1',
    tab_id: 'tab-1',
    workspace_id: 'workspace-1',
    focused: true,
    revision: 1,
    agent,
    display_agent: agent,
    agent_status: 'idle',
    agent_session: {
      agent,
      source: `herdr:${agent}`,
      kind: 'id',
      value:
        agent === 'codex'
          ? '11111111-1111-4111-8111-111111111111'
          : 'ses_abc123',
    },
  };
  let snapshot = {
    server: { running: true },
    agents: [],
    panes: [pane],
    layouts: [],
    workspaces: [
      { workspace_id: 'workspace-1', active_tab_id: 'tab-1', focused: true },
    ],
    tabs: [{ workspace_id: 'workspace-1', tab_id: 'tab-1', focused: true }],
  } as unknown as HerdrSnapshot;
  const native = {
    hostState: jest.fn(() => ({
      syncStatus: 'synced',
      freshness: 'fresh',
      snapshot,
    })),
    openAgentChat: jest.fn(
      (): NativeAgentChatOpenResult => ({
        type: 'no-chat',
        terminalId: 'terminal-1',
        reason: 'unsupported-pane',
      }),
    ),
    currentAgentChat: jest.fn(() => undefined),
    startAgentChat: jest.fn(
      (): NativeAgentChatStartResult => ({ type: 'stale-binding' }),
    ),
    detachAgentChat: jest.fn(),
    agentIntegrationStatus: jest.fn(
      async (): Promise<RuntimeAgentIntegrationStatus> => 'current',
    ),
    installAgentIntegration: jest.fn(async () => ({
      kind: agent,
      messages: [],
    })),
  };
  const client = {
    native,
    snapshot: jest.fn(async () => snapshot),
  } as unknown as Props['client'];
  const terminal = {
    terminalId: pane.terminal_id,
    paneId: pane.pane_id,
    title: 'Agent',
    status: 'connected' as const,
    reconnectAttempt: 0,
  };
  const props: Props = {
    hostSessionId: 'host-1',
    visible: true,
    snapshot,
    client,
    terminalState: {
      sessions: [terminal],
      activeTerminalId: terminal.terminalId,
    },
    terminalTargets: [
      { key: 'target', hostSessionId: 'host-1', client, session: terminal },
    ],
    terminalPreferences: { fullscreen: true } as Props['terminalPreferences'],
    terminalControlUsage: {},
    terminalHistory: [],
    latencyMs: null,
    latencyWarningActive: false,
    appBackgroundImageUri: null,
    appBackgroundDimming: 60,
    onRefresh: jest.fn(async () => {}),
    onOpenPane: jest.fn(),
    onActivateTerminal: jest.fn(),
    onCloseTerminal: jest.fn(),
    onTerminalStatus: jest.fn(),
    onTerminalFontSizeChange: jest.fn(),
    onOpenFiles: jest.fn(),
    getComposerDraft: () => '',
    onComposerDraftChange: jest.fn(),
    onTerminalControlUse: jest.fn(),
    onTerminalHistoryEntry: jest.fn(),
    onTerminalOpenLinksInAppChange: jest.fn(),
    onInteraction: jest.fn(),
    onExit: jest.fn(),
  };
  return {
    props,
    native,
    client,
    pane,
    setSnapshot: (next: HerdrSnapshot) => {
      snapshot = next;
    },
  };
}

let renderer: ReactTestRenderer;
const ui = (name: string) =>
  renderer.root.find(node => String(node.type) === name);
const control = () => ui('TerminalScreen').props.chatControl;

beforeEach(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(agentChatCache, 'loadNative').mockResolvedValue(null);
});
afterEach(() => {
  act(() => renderer?.unmount());
  agentTranscriptService.reset();
  jest.restoreAllMocks();
});

function bindChat(host: ReturnType<typeof setup>, agent: ChatAgent) {
  host.native.openAgentChat.mockReturnValue({
    type: 'bound',
    binding: {
      bindingToken: 'binding-1',
      bindingGeneration: 1,
      runtimeIncarnation: 1,
      terminalId: 'terminal-1',
      paneId: 'pane-1',
      agent,
      sessionId: 'opaque-native-id',
      transcriptKey: 'transcript-1',
      state: {
        agent,
        sessionId: 'opaque-native-id',
        status: 'loading',
        revision: 0,
        messages: [],
        turns: [],
      },
    },
  });
}

describe.each(['codex', 'opencode'] as const)('%s SessionScreen', agent => {
  test('tap Chat starts the spinner immediately, then persistent native no-chat shows remediation and stops it', async () => {
    const host = setup(agent);
    act(() => {
      renderer = create(<SessionScreen {...host.props} />);
    });
    let opening!: Promise<void>;
    act(() => {
      opening = control().onPress();
    });
    expect(control().loading).toBe(true);
    await act(async () => {
      await opening;
    });
    expect(host.native.openAgentChat).toHaveBeenCalledTimes(2);
    expect(host.native.agentIntegrationStatus).toHaveBeenCalledWith(agent);
    expect(ui('IdentitySheet').props.warning).toMatchObject({
      agent,
      title: expect.stringContaining('identity unavailable'),
    });
    expect(control().loading).toBe(false);
  });

  test('stale native start after explicit open shows an alert and clears the presentation spinner', async () => {
    const host = setup(agent);
    bindChat(host, agent);
    act(() => {
      renderer = create(<SessionScreen {...host.props} />);
    });
    await act(async () => {
      await control().onPress();
    });
    expect(ui('Alert').props.visible).toBe(true);
    expect(ui('Alert').props.message).toContain('requested Chat binding');
    expect(control().loading).toBe(false);
    act(() => { ui('Alert').props.onClose(); });
    // Even if native reuses a token, a new explicit presentation must subscribe.
    await act(async () => {
      await control().onPress();
    });
    expect(ui('Alert').props.visible).toBe(true);
    expect(control().loading).toBe(false);
  });

  test('a usable transcript keeps loading until the viewport is ready, then becomes visible', async () => {
    const host = setup(agent);
    bindChat(host, agent);
    host.native.startAgentChat.mockReturnValue({
      type: 'started',
      state: {
        agent,
        sessionId: 'opaque-native-id',
        status: 'live',
        revision: 1,
        messages: [],
        turns: [],
      },
    });
    act(() => {
      renderer = create(<SessionScreen {...host.props} />);
    });
    await act(async () => {
      await control().onPress();
    });
    expect(control().loading).toBe(true);
    expect(ui('TerminalScreen').props.chatViewEnabled).toBe(false);
    const viewport = ui('TerminalScreen').props.renderViewportOverlay(
      { top: 0, bottom: 0 },
      0,
    );
    act(() => { viewport.props.onInitialViewportReady(); });
    expect(ui('TerminalScreen').props.chatViewEnabled).toBe(true);
    expect(control().loading).toBe(false);
    expect(ui('Alert').props.visible).toBe(false);
  });

  test('integration remediation installs the actual agent and settles into a restart warning', async () => {
    const host = setup(agent);
    host.native.agentIntegrationStatus.mockResolvedValueOnce('not-installed');
    act(() => {
      renderer = create(<SessionScreen {...host.props} />);
    });
    await act(async () => {
      await control().onPress();
    });
    expect(ui('IntegrationSheet').props.integration.agent).toBe(agent);
    expect(control().loading).toBe(false);
    await act(async () => {
      await ui('IntegrationSheet').props.onInstall();
    });
    expect(host.native.installAgentIntegration).toHaveBeenCalledWith(agent);
    expect(ui('IdentitySheet').props.warning.title).toContain('Restart');
    expect(control().loading).toBe(false);
  });

  test('a confirmed agent-to-shell transition during cache restoration closes quietly', async () => {
    const host = setup(agent);
    bindChat(host, agent);
    let restore!: (value: null) => void;
    jest.mocked(agentChatCache.loadNative).mockReturnValueOnce(
      new Promise(resolve => {
        restore = resolve;
      }),
    );
    act(() => {
      renderer = create(<SessionScreen {...host.props} />);
    });
    await act(async () => {
      await control().onPress();
    });
    expect(control().loading).toBe(true);
    const snapshot = {
      ...host.props.snapshot,
      panes: [
        {
          ...host.pane,
          agent: 'shell',
          display_agent: 'shell',
          agent_session: undefined,
        },
      ],
    };
    host.setSnapshot(snapshot);
    await act(async () => {
      renderer.update(<SessionScreen {...host.props} snapshot={snapshot} />);
      restore(null);
    });
    expect(ui('Alert').props.visible).toBe(false);
    expect(ui('TerminalScreen').props.chatViewEnabled).toBe(false);
    expect(control()).toBeUndefined();
  });
});
