import { AudioRecorder } from './audioRecorder.js';
import { AudioPlayer } from './audioPlayer.js';
import {
  JarvisVoiceState,
  JarvisVoiceCallbacks,
  ServerWsMessage,
  ActionRequired,
  TranscriptItem
} from '../types/jarvisVoice.js';

export class JarvisVoiceClient {
  private socket: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private player: AudioPlayer | null = null;
  private state: JarvisVoiceState = 'DISCONNECTED';
  private callbacks: JarvisVoiceCallbacks;
  private pingInterval: number | null = null;
  private contextClassId: string | null = null;

  constructor(callbacks: JarvisVoiceCallbacks = {}) {
    this.callbacks = callbacks;

    this.player = new AudioPlayer({
      outputSampleRate: 24000,
      onPlaybackStateChange: (isPlaying) => {
        if (isPlaying && this.state !== 'SPEAKING') {
          this.setState('SPEAKING');
        } else if (!isPlaying && this.state === 'SPEAKING') {
          this.setState('LISTENING');
        }
      },
      onError: (err) => {
        this.callbacks.onError?.(err);
      }
    });

    this.recorder = new AudioRecorder({
      onAudioChunk: (base64Pcm) => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          // Send audio chunk to backend WebSocket
          this.socket.send(JSON.stringify({ type: 'audio', data: base64Pcm }));
          this.callbacks.onAudio?.(base64Pcm);
        }
      },
      onError: (err) => {
        this.callbacks.onError?.(err);
      }
    });
  }

  public getState(): JarvisVoiceState {
    return this.state;
  }

  private setState(newState: JarvisVoiceState) {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange?.(newState);
    }
  }

  public getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/jarvis-live`;
  }

  public async connect(classId?: string): Promise<boolean> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return true;
    }

    if (classId) {
      this.contextClassId = classId;
    }

    this.setState('CONNECTING');
    const url = this.getWsUrl();

    try {
      // Ensure AudioPlayer audio context is initialized / resumed on user gesture
      await this.player?.ensureAudioContext();

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.startHeartbeat();
        if (this.contextClassId && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'context', classId: this.contextClassId }));
        }
      };

      this.socket.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };

      this.socket.onerror = (err) => {
        console.error('[JarvisVoiceClient] WebSocket error:', err);
        this.callbacks.onError?.({ message: 'Canlı ses bağlantı hatası oluştu.', code: 'WS_ERROR' });
        this.setState('ERROR');
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.setState('DISCONNECTED');
      };

      return true;
    } catch (err: any) {
      console.error('[JarvisVoiceClient] Connection failed:', err);
      this.callbacks.onError?.({ message: 'Canlı ses bağlantısı kurulamadı.', code: 'CONNECT_FAILED' });
      this.setState('ERROR');
      return false;
    }
  }

  private handleServerMessage(dataStr: string) {
    let msg: ServerWsMessage;
    try {
      msg = JSON.parse(dataStr);
    } catch (e) {
      console.warn('[JarvisVoiceClient] Malformed backend WS JSON message:', dataStr);
      return;
    }

    switch (msg.type) {
      case 'session_ready':
        this.setState('LISTENING');
        break;

      case 'context_updated':
        this.callbacks.onContextUpdated?.(msg.classId, msg.className);
        break;

      case 'audio':
        if (msg.data) {
          this.player?.playChunk(msg.data);
        }
        break;

      case 'transcript':
        if (msg.text) {
          this.callbacks.onTranscript?.({ role: msg.role, text: msg.text });
        }
        break;

      case 'interrupted':
        this.player?.interrupt();
        this.callbacks.onInterrupted?.();
        this.setState('INTERRUPTED');
        setTimeout(() => {
          if (this.state === 'INTERRUPTED') {
            this.setState('LISTENING');
          }
        }, 100);
        break;

      case 'action_required':
        this.callbacks.onActionRequired?.(msg.action);
        break;

      case 'navigation':
        this.callbacks.onNavigation?.(msg.navigation);
        break;

      case 'error':
        this.callbacks.onError?.({ message: msg.message || 'JARVIS canlı ses hatası', code: 'SERVER_ERROR' });
        this.setState('ERROR');
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        break;
    }
  }

  public async startListening(): Promise<boolean> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    const started = await this.recorder?.start();
    if (started) {
      this.setState('LISTENING');
    }
    return !!started;
  }

  public stopListening(): void {
    this.recorder?.stop();
    if (this.state === 'LISTENING') {
      this.setState('IDLE');
    }
  }

  public sendText(text: string): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && text.trim()) {
      this.socket.send(JSON.stringify({ type: 'text', data: text }));
      this.setState('THINKING');
      return true;
    }
    return false;
  }

  public sendContext(classId: string): boolean {
    this.contextClassId = classId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'context', classId }));
      return true;
    }
    return false;
  }

  public interrupt(): void {
    this.player?.interrupt();
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.recorder?.stop();
    this.player?.stop();

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }

    this.setState('DISCONNECTED');
  }

  public destroy(): void {
    this.disconnect();
    this.recorder?.destroy();
    this.player?.destroy();
    this.recorder = null;
    this.player = null;
  }
}
