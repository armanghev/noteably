import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/constants";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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

  const connect = () => {
    if (!user || !session?.access_token) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    if (socketRef.current?.readyState === WebSocket.CONNECTING) return;

    try {
      // Construct WebSocket URL from API_BASE_URL
      // Handle both absolute and relative URLs
      let wsBase = "";

      if (API_BASE_URL.startsWith("http")) {
        const urlObj = new URL(API_BASE_URL);
        const protocol = urlObj.protocol.replace("http", "ws");
        wsBase = `${protocol}//${urlObj.host}`;
      } else {
        // Relative path, use window.location
        const protocol = window.location.protocol.replace("http", "ws");
        wsBase = `${protocol}//${window.location.host}`;
      }

      const wsUrl = `${wsBase}/ws/user/?token=${session.access_token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WS Connected");
        setIsConnected(true);
        // Clear any pending reconnects
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

        // Reconnect if we still have a user session
        if (session?.access_token) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting WS reconnect...");
            connect();
          }, 3000);
        }
      };

      ws.onerror = (e) => {
        console.error("WS Error", e);
        ws.close();
      };

      socketRef.current = ws;
    } catch (error) {
      console.error("Failed to construct WebSocket URL:", error);
    }
  };

  // Connect when user/session is available
  useEffect(() => {
    if (user && session) {
      connect();
    } else {
      // Cleanup if user logs out
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session?.access_token]);

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
