import { useAuthStore } from '../stores/authStore';
import { getApiUrl } from './api';

class SocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect() {
    const { accessToken, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !accessToken) return;

    if (this.socket) {
        this.socket.close();
    }

    const apiUrl = getApiUrl();
    const wsUrl = apiUrl.replace('/api', '').replace('http', 'ws') + '/ws/ride/';
    
    // Add token to URL for JWTAuthMiddleware to pick up (encoded for safety)
    this.socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(accessToken)}`);

    this.socket.onopen = () => {
      console.log('[WebSocket] Connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Message:', data.type);
        this.notify(data.type, data);
      } catch (e) {
        console.log('[WebSocket] Parse error:', e);
      }
    };

    this.socket.onclose = (e) => {
      console.log('[WebSocket] Closed:', e.code, e.reason);
      this.attemptReconnect();
    };

    this.socket.onerror = (e: any) => {
      console.log('[WebSocket] Error:', e.message || 'Connection failed');
      // If error is related to authentication, we might need to logout
      if (e.message && (e.message.includes('401') || e.message.includes('403'))) {
          console.log('[WebSocket] Auth failure, logging out...');
          useAuthStore.getState().logout();
      }
    };
  }

  private attemptReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      console.log('[WebSocket] Attempting reconnect...');
      this.connect();
    }, 5000);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => this.off(event, callback);
  }

  off(event: string, callback: (data: any) => void) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  private notify(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(cb => cb(data));
    }
  }

  send(type: string, data: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, ...data }));
    } else {
      console.log('[WebSocket] Send failed: Socket not open');
    }
  }
}

export const socketService = new SocketService();
