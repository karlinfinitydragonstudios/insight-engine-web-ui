import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';

interface WebSocketMessage {
  type: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  pipelineName?: string;
  timestamp?: number;
}

interface UseWebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  send: (message: WebSocketMessage) => void;
  subscribe: (type: string, callback: (message: WebSocketMessage) => void) => () => void;
  lastMessage: WebSocketMessage | null;
}

const DEFAULT_URL = 'ws://localhost:8000/ws';
const DEFAULT_RECONNECT_INTERVAL = 3000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = DEFAULT_URL,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map());

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const { setSessionId, setIsConnected: setStoreConnected } = useAppStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');

    try {
      const sessionId = localStorage.getItem('sessionId');
      const wsUrl = sessionId ? `${url}?sessionId=${sessionId}` : url;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionState('connected');
        setStoreConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);

          // Handle session assignment
          if (message.type === 'connected' && message.payload?.sessionId) {
            const newSessionId = message.payload.sessionId as string;
            setSessionId(newSessionId);
            localStorage.setItem('sessionId', newSessionId);
          }

          // Notify subscribers
          const typeSubscribers = subscribersRef.current.get(message.type);
          if (typeSubscribers) {
            typeSubscribers.forEach((callback) => callback(message));
          }

          // Also notify 'all' subscribers
          const allSubscribers = subscribersRef.current.get('*');
          if (allSubscribers) {
            allSubscribers.forEach((callback) => callback(message));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setStoreConnected(false);
        wsRef.current = null;

        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          setConnectionState('connecting');
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setConnectionState('disconnected');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionState('error');
    }
  }, [url, reconnectInterval, maxReconnectAttempts, setSessionId, setStoreConnected]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  const subscribe = useCallback((type: string, callback: (message: WebSocketMessage) => void) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set());
    }
    subscribersRef.current.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const typeSubscribers = subscribersRef.current.get(type);
      if (typeSubscribers) {
        typeSubscribers.delete(callback);
        if (typeSubscribers.size === 0) {
          subscribersRef.current.delete(type);
        }
      }
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    connectionState,
    send,
    subscribe,
    lastMessage,
  };
}
