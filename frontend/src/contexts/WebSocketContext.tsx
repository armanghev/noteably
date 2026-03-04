import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const MAX_RECONNECT_ATTEMPTS = 3;

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(async () => {
    if (!user) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    if (socketRef.current?.readyState === WebSocket.CONNECTING) return;

    // Get a fresh session to avoid using stale tokens
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    if (!freshSession?.access_token) {
      console.log("WS: No valid session, skipping connection");
      return;
    }

    try {
      let wsBase = "";

      if (API_BASE_URL.startsWith("http")) {
        const urlObj = new URL(API_BASE_URL);
        const protocol = urlObj.protocol.replace("http", "ws");
        wsBase = `${protocol}//${urlObj.host}`;
      } else {
        const protocol = window.location.protocol.replace("http", "ws");
        wsBase = `${protocol}//${window.location.host}`;
      }

      const wsUrl = `${wsBase}/ws/user/?token=${freshSession.access_token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WS Connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WS Message:", data);
          setLastMessage(data);
        } catch (e) {
          console.error("WS Parse Error", e);
        }
      };

      ws.onclose = () => {
        console.log("WS Closed");
        setIsConnected(false);
        socketRef.current = null;

        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn(
            `WS: Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached, stopping`,
          );
          return;
        }

        const delay = Math.min(3000 * 2 ** reconnectAttemptsRef.current, 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(
            `WS: Reconnect attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS}...`,
          );
          connect();
        }, delay);
      };

      ws.onerror = (e) => {
        console.error("WS Error", e);
        ws.close();
      };

      socketRef.current = ws;
    } catch (error) {
      console.error("Failed to construct WebSocket URL:", error);
    }
  }, [user]);

  // Connect when user/session is available
  useEffect(() => {
    if (user && session) {
      reconnectAttemptsRef.current = 0;
      connect();
    } else {
      socketRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    }

    return () => {
      socketRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, session?.access_token, connect]);

  const sendMessage = (data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket not connected");
    }
  };

  return (
    <WebSocketContext.Provider
      value={{ isConnected, lastMessage, sendMessage }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context)
    throw new Error("useWebSocket must be used within WebSocketProvider");
  return context;
};
