/**
 * Soniox WebSocket Client for Transcript Module
 * Adapted from transcript-video project
 */

const SONIOX_ENDPOINT = 'wss://stt-rt.soniox.com/transcribe-websocket';

const MAX_RECONNECT = 3;
const RECONNECT_DELAY_MS = 2000;
const SESSION_DURATION_MS = 3 * 60 * 1000; // 3 minutes
const CONTEXT_HISTORY_CHARS = 500;

export interface SonioxConfig {
  apiKey: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  customContext?: {
    domain?: string;
    terms?: string[];
  };
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  speaker: string | null;
  originalText: string;
  translatedText?: string;
  isFinal: boolean;
}

export class SonioxClient {
  private ws: WebSocket | null = null;
  private apiKey = '';
  private isConnected = false;
  private reconnectAttempts = 0;
  private config: SonioxConfig | null = null;
  private intentionalDisconnect = false;
  private sessionTimer: NodeJS.Timeout | null = null;
  private recentTranslations: string[] = [];
  private segments: TranscriptSegment[] = [];
  private currentSegment: Partial<TranscriptSegment> | null = null;

  // Callbacks
  onSegment?: (segment: TranscriptSegment) => void;
  onProvisional?: (text: string) => void;
  onStatusChange?: (status: string) => void;
  onError?: (error: string) => void;

  connect(config: SonioxConfig) {
    this.apiKey = config.apiKey;
    this.config = config;
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.recentTranslations = [];
    this.segments = [];

    if (!config.apiKey) {
      this.setStatus('error');
      this.onError?.('API key is required');
      return;
    }

    this.doConnect(config);
  }

  private doConnect(config: SonioxConfig, carryoverContext?: string) {
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(SONIOX_ENDPOINT);
    } catch (err) {
      this.setStatus('error');
      this.onError?.(`Failed to create WebSocket: ${(err as Error).message}`);
      return;
    }

    this.ws.onopen = () => {
      const configMsg: any = {
        api_key: this.apiKey,
        model: 'stt-rt-v4',
        audio_format: 'pcm_s16le',
        sample_rate: 16000,
        num_channels: 1,
        enable_endpoint_detection: true,
        max_endpoint_delay_ms: 1500,
        enable_speaker_diarization: true,
      };

      if (config.sourceLanguage && config.sourceLanguage !== 'auto') {
        configMsg.language_hints = [config.sourceLanguage];
      }

      if (config.targetLanguage) {
        configMsg.translation = {
          type: 'one_way',
          target_language: config.targetLanguage,
        };
      }

      const domain = this.buildDomain(config.customContext, carryoverContext);
      const terms = config.customContext?.terms || [];
      if (domain || terms.length > 0) {
        configMsg.context = {};
        if (domain) configMsg.context.domain = domain;
        if (terms.length > 0) configMsg.context.terms = terms;
      }

      // Only send if WebSocket is in OPEN state (not just CONNECTING)
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(configMsg));
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startSessionTimer();
      } else {
        // Queue the config message to be sent when truly ready
        const attemptSend = () => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(configMsg));
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.setStatus('connected');
            this.startSessionTimer();
          } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            // Retry after a short delay
            setTimeout(attemptSend, 50);
          }
        };
        attemptSend();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error_code) {
          this.handleApiError(data);
          return;
        }
        this.handleResponse(data);
      } catch (err) {
        console.error('Failed to parse Soniox response:', err);
      }
    };

    this.ws.onerror = () => {
      this.onError?.('WebSocket error occurred');
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      if (this.ws === event.target) {
        this.ws = null;
      }

      if (this.intentionalDisconnect) {
        this.setStatus('disconnected');
        return;
      }

      if (event.code === 1000) {
        this.setStatus('disconnected');
      } else if (event.code === 4001 || event.code === 4003) {
        this.setStatus('error');
        this.onError?.('Invalid API key');
      } else if (event.code === 4029) {
        this.setStatus('error');
        this.onError?.('Rate limit exceeded');
      } else {
        this.tryReconnect(`Connection closed (code: ${event.code})`);
      }
    };
  }

  sendAudio(pcmData: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(pcmData);
    }
  }

  disconnect() {
    this.intentionalDisconnect = true;
    this.stopSessionTimer();

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(new ArrayBuffer(0));
        }
        this.ws.close(1000, 'User disconnected');
      } catch (err) {
        console.error('Error during disconnect:', err);
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.setStatus('disconnected');
  }

  getSegments(): TranscriptSegment[] {
    return this.segments;
  }

  private handleResponse(data: any) {
    if (!data.tokens || data.tokens.length === 0) return;

    let originalText = '';
    let translationText = '';
    let provisionalText = '';
    let speaker: string | null = null;
    let hasEnd = false;

    for (const token of data.tokens) {
      if (token.text === '<end>') {
        hasEnd = true;
        continue;
      }

      if (token.speaker && token.translation_status === 'original') {
        speaker = `Speaker ${token.speaker}`;
      }

      if (token.translation_status === 'original') {
        if (token.is_final) {
          originalText += token.text + ' ';
        } else {
          provisionalText += token.text + ' ';
        }
      } else if (token.translation_status === 'translation') {
        if (token.is_final) {
          translationText += token.text + ' ';
        }
      }
    }

    // Finalize segment
    if (originalText.trim() || hasEnd) {
      if (this.currentSegment && this.currentSegment.originalText) {
        this.currentSegment.originalText += ' ' + originalText.trim();
        if (translationText.trim()) {
          this.currentSegment.translatedText = translationText.trim();
          this.addToHistory(translationText.trim());
        }
        this.currentSegment.isFinal = true;
        this.currentSegment.endTime = Date.now();
        this.segments.push(this.currentSegment as TranscriptSegment);
        this.onSegment?.(this.segments[this.segments.length - 1]);
        this.currentSegment = null;
      } else if (originalText.trim()) {
        const segment: TranscriptSegment = {
          startTime: Date.now(),
          endTime: Date.now(),
          speaker,
          originalText: originalText.trim(),
          translatedText: translationText.trim() || undefined,
          isFinal: true,
        };
        if (segment.translatedText) {
          this.addToHistory(segment.translatedText);
        }
        this.segments.push(segment);
        this.onSegment?.(segment);
      }
    } else if (provisionalText.trim()) {
      this.currentSegment = {
        startTime: this.currentSegment?.startTime || Date.now(),
        speaker: speaker || this.currentSegment?.speaker,
        originalText: (this.currentSegment?.originalText || '') + provisionalText.trim(),
        isFinal: false,
      };
      this.onProvisional?.(this.currentSegment.originalText);
    } else {
      this.onProvisional?.('');
    }
  }

  private addToHistory(text: string) {
    this.recentTranslations.push(text);
    let total = this.recentTranslations.reduce((sum, t) => sum + t.length, 0);
    while (total > CONTEXT_HISTORY_CHARS && this.recentTranslations.length > 1) {
      const removed = this.recentTranslations.shift();
      if (removed) total -= removed.length;
    }
  }

  private getCarryoverContext(): string | null {
    if (this.recentTranslations.length === 0) return null;
    return this.recentTranslations.join(' ').trim();
  }

  private buildDomain(customContext: any, carryoverContext?: string): string | null {
    const parts: string[] = [];
    if (customContext?.domain) {
      parts.push(customContext.domain);
    }
    if (carryoverContext) {
      parts.push(`Recent: ${carryoverContext}`);
    }
    return parts.length > 0 ? parts.join('. ') : null;
  }

  private startSessionTimer() {
    this.stopSessionTimer();
    this.sessionTimer = setTimeout(() => {
      this.seamlessReset();
    }, SESSION_DURATION_MS);
  }

  private stopSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private seamlessReset() {
    if (!this.config || this.intentionalDisconnect) return;
    const carryover = this.getCarryoverContext();
    this.doConnect(this.config, carryover || undefined);
  }

  private tryReconnect(reason: string) {
    if (this.reconnectAttempts >= MAX_RECONNECT) {
      this.setStatus('error');
      this.onError?.(`${reason}. Reconnect failed.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;

    this.setStatus('connecting');
    this.onError?.(`${reason}. Reconnecting...`);

    setTimeout(() => {
      if (!this.intentionalDisconnect && this.config) {
        const carryover = this.getCarryoverContext();
        this.doConnect(this.config, carryover || undefined);
      }
    }, delay);
  }

  private handleApiError(data: any) {
    const code = data.error_code || 0;
    const message = data.error_message || 'Unknown API error';

    if (code === 408) {
      this.tryReconnect('Request timeout');
      return;
    }

    let userMessage = message;
    if (code === 401) {
      userMessage = 'Invalid API key';
    } else if (code === 429) {
      userMessage = 'Rate limit exceeded';
    }

    this.setStatus('error');
    this.onError?.(userMessage);
  }

  private setStatus(status: string) {
    this.onStatusChange?.(status);
  }
}

export const sonioxClient = new SonioxClient();
