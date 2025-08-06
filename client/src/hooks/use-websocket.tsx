import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  onConnect?: (ws: WebSocket) => void;
  onDisconnect?: (event: CloseEvent) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  shouldReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: MessageEvent | null;
  sendMessage: (message: string | object) => void;
  reconnect: () => void;
  disconnect: () => void;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempts: number;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    onConnect,
    onDisconnect,
    onMessage,
    onError,
    shouldReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyDisconnected = useRef(false);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    
    try {
      // Construct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}${url}`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = (event) => {
        console.log('WebSocket connected:', url);
        setIsConnected(true);
        setConnectionState('connected');
        setReconnectAttempts(0);
        onConnect?.(ws.current!);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', url, event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        onDisconnect?.(event);

        // Attempt to reconnect if not manually disconnected
        if (shouldReconnect && !isManuallyDisconnected.current && reconnectAttempts < maxReconnectAttempts) {
          setConnectionState('reconnecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onmessage = (event) => {
        setLastMessage(event);
        onMessage?.(event);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState('disconnected');
    }
  }, [url, onConnect, onDisconnect, onMessage, onError, shouldReconnect, reconnectInterval, maxReconnectAttempts, reconnectAttempts]);

  const disconnect = useCallback(() => {
    isManuallyDisconnected.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
    setReconnectAttempts(0);
  }, []);

  const reconnect = useCallback(() => {
    isManuallyDisconnected.current = false;
    setReconnectAttempts(0);
    disconnect();
    
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect]);

  const sendMessage = useCallback((message: string | object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      ws.current.send(messageStr);
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  // Initial connection
  useEffect(() => {
    isManuallyDisconnected.current = false;
    connect();

    // Cleanup on unmount
    return () => {
      isManuallyDisconnected.current = true;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const heartbeat = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'PING' });
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(heartbeat);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect,
    disconnect,
    connectionState,
    reconnectAttempts
  };
}
