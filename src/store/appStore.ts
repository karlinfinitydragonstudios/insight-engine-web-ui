import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface SessionListItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastActivityAt: string;
}

interface SessionState {
  sessionId: string | null;
  userId: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  connectedAt: string | null;
  lastActivityAt: string | null;
  expiresAt: string | null;
}

interface SessionListState {
  sessions: SessionListItem[];
  isLoading: boolean;
  error: string | null;
}

interface UIState {
  chatPanelWidth: number;
  documentPanelVisible: boolean;
  activeSidebarTab: 'chat' | 'history' | 'references';
  theme: 'dark' | 'light' | 'claude';
  sidebarOpen: boolean;
  isLoading: boolean;
  loadingMessage: string | null;
}

interface AppState {
  session: SessionState;
  sessionList: SessionListState;
  ui: UIState;

  // Session Actions
  setSession: (session: Partial<SessionState>) => void;
  resetSession: () => void;
  setConnected: (sessionId: string) => void;
  setDisconnected: () => void;
  setSessionId: (sessionId: string) => void;
  setIsConnected: (isConnected: boolean) => void;

  // Session List Actions
  setSessions: (sessions: SessionListItem[]) => void;
  setSessionsLoading: (isLoading: boolean) => void;
  setSessionsError: (error: string | null) => void;
  addSession: (session: SessionListItem) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  removeSession: (sessionId: string) => void;

  // UI Actions
  updateUI: (ui: Partial<UIState>) => void;
  toggleSidebar: () => void;
  setLoading: (isLoading: boolean, message?: string | null) => void;
}

const initialSession: SessionState = {
  sessionId: null,
  userId: null,
  status: 'disconnected',
  connectedAt: null,
  lastActivityAt: null,
  expiresAt: null,
};

const initialSessionList: SessionListState = {
  sessions: [],
  isLoading: false,
  error: null,
};

const initialUI: UIState = {
  chatPanelWidth: 40,
  documentPanelVisible: true,
  activeSidebarTab: 'chat',
  theme: 'dark',
  sidebarOpen: true,
  isLoading: false,
  loadingMessage: null,
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        session: initialSession,
        sessionList: initialSessionList,
        ui: initialUI,

        // Session actions
        setSession: (sessionUpdate) =>
          set(
            (state) => ({
              session: { ...state.session, ...sessionUpdate },
            }),
            false,
            'setSession'
          ),

        resetSession: () =>
          set({ session: initialSession }, false, 'resetSession'),

        setConnected: (sessionId) =>
          set(
            (state) => ({
              session: {
                ...state.session,
                sessionId,
                status: 'connected',
                connectedAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
              },
            }),
            false,
            'setConnected'
          ),

        setDisconnected: () =>
          set(
            (state) => ({
              session: {
                ...state.session,
                status: 'disconnected',
              },
            }),
            false,
            'setDisconnected'
          ),

        setSessionId: (sessionId) =>
          set(
            (state) => ({
              session: {
                ...state.session,
                sessionId,
              },
            }),
            false,
            'setSessionId'
          ),

        setIsConnected: (isConnected) =>
          set(
            (state) => ({
              session: {
                ...state.session,
                status: isConnected ? 'connected' : 'disconnected',
                connectedAt: isConnected ? new Date().toISOString() : state.session.connectedAt,
              },
            }),
            false,
            'setIsConnected'
          ),

        // Session list actions
        setSessions: (sessions) =>
          set({ sessionList: { sessions, isLoading: false, error: null } }, false, 'setSessions'),

        setSessionsLoading: (isLoading) =>
          set(
            (state) => ({ sessionList: { ...state.sessionList, isLoading } }),
            false,
            'setSessionsLoading'
          ),

        setSessionsError: (error) =>
          set(
            (state) => ({ sessionList: { ...state.sessionList, error, isLoading: false } }),
            false,
            'setSessionsError'
          ),

        addSession: (session) =>
          set(
            (state) => ({
              sessionList: {
                ...state.sessionList,
                sessions: [session, ...state.sessionList.sessions],
              },
            }),
            false,
            'addSession'
          ),

        updateSessionTitle: (sessionId, title) =>
          set(
            (state) => ({
              sessionList: {
                ...state.sessionList,
                sessions: state.sessionList.sessions.map((s) =>
                  s.id === sessionId ? { ...s, title } : s
                ),
              },
            }),
            false,
            'updateSessionTitle'
          ),

        removeSession: (sessionId) =>
          set(
            (state) => ({
              sessionList: {
                ...state.sessionList,
                sessions: state.sessionList.sessions.filter((s) => s.id !== sessionId),
              },
            }),
            false,
            'removeSession'
          ),

        // UI actions
        updateUI: (uiUpdate) =>
          set(
            (state) => ({
              ui: { ...state.ui, ...uiUpdate },
            }),
            false,
            'updateUI'
          ),

        toggleSidebar: () =>
          set(
            (state) => ({
              ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
            }),
            false,
            'toggleSidebar'
          ),

        setLoading: (isLoading, message = null) =>
          set(
            (state) => ({
              ui: { ...state.ui, isLoading, loadingMessage: message },
            }),
            false,
            'setLoading'
          ),
      }),
      {
        name: 'insights-engine-app',
        partialize: (state) => ({
          ui: state.ui,
          session: { sessionId: state.session.sessionId }, // Persist current session ID
        }),
        merge: (persistedState: any, currentState: AppState) => ({
          ...currentState,
          ui: persistedState?.ui ?? currentState.ui,
          session: {
            ...currentState.session,
            sessionId: persistedState?.session?.sessionId ?? null,
          },
        }),
      }
    ),
    { name: 'AppStore' }
  )
);
