import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface SessionState {
  sessionId: string | null;
  userId: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  connectedAt: string | null;
  lastActivityAt: string | null;
  expiresAt: string | null;
}

interface UIState {
  chatPanelWidth: number;
  documentPanelVisible: boolean;
  activeSidebarTab: 'chat' | 'history' | 'references';
  theme: 'dark'; // Only dark theme for now (gold/black)
}

interface AppState {
  session: SessionState;
  ui: UIState;

  // Actions
  setSession: (session: Partial<SessionState>) => void;
  resetSession: () => void;
  updateUI: (ui: Partial<UIState>) => void;
  setConnected: (sessionId: string) => void;
  setDisconnected: () => void;
  setSessionId: (sessionId: string) => void;
  setIsConnected: (isConnected: boolean) => void;
}

const initialSession: SessionState = {
  sessionId: null,
  userId: null,
  status: 'disconnected',
  connectedAt: null,
  lastActivityAt: null,
  expiresAt: null,
};

const initialUI: UIState = {
  chatPanelWidth: 40,
  documentPanelVisible: true,
  activeSidebarTab: 'chat',
  theme: 'dark',
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        session: initialSession,
        ui: initialUI,

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

        updateUI: (uiUpdate) =>
          set(
            (state) => ({
              ui: { ...state.ui, ...uiUpdate },
            }),
            false,
            'updateUI'
          ),

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
      }),
      {
        name: 'insights-engine-app',
        partialize: (state) => ({ ui: state.ui }), // Only persist UI state
      }
    ),
    { name: 'AppStore' }
  )
);
