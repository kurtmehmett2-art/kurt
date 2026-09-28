export type JarvisVoiceState =
  | 'IDLE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR'
  | 'DISCONNECTED';

export interface ActionRequired {
  name: string;
  args: Record<string, any>;
}

export interface TranscriptItem {
  role: 'user' | 'assistant';
  text: string;
}

export interface JarvisVoiceCallbacks {
  onStateChange?: (state: JarvisVoiceState) => void;
  onAudio?: (base64Pcm: string) => void;
  onTranscript?: (transcript: TranscriptItem) => void;
  onInterrupted?: () => void;
  onActionRequired?: (action: ActionRequired) => void;
  onNavigation?: (navigation: any) => void;
  onError?: (error: { message: string; code?: string }) => void;
  onContextUpdated?: (classId: string, className: string) => void;
}

export type ServerWsMessage =
  | { type: 'session_ready' }
  | { type: 'audio'; data: string }
  | { type: 'transcript'; role: 'user' | 'assistant'; text: string }
  | { type: 'interrupted' }
  | { type: 'action_required'; action: ActionRequired }
  | { type: 'navigation'; navigation: any }
  | { type: 'error'; message: string }
  | { type: 'pong' }
  | { type: 'context_updated'; classId: string; className: string };

export type ClientWsMessage =
  | { type: 'ping' }
  | { type: 'context'; classId: string }
  | { type: 'audio'; data: string }
  | { type: 'text'; data: string };
