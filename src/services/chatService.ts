import type { AgoraChatMessage } from '../types/agora.types';
import type { UID, IAgoraRTCClient } from 'agora-rtc-sdk-ng';

/**
 * Chat Service
 * Chat implementation using Agora RTC Data Streams
 * Messages are sent via Agora's data channel
 */

class ChatService {
  private messages: AgoraChatMessage[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private currentUserUid: UID | null = null;
  private currentUserName: string = '';
  private agoraClient: IAgoraRTCClient | null = null;
  private dataStreamId: number | null = null;

  /**
   * Initialize chat with user info and Agora client
   */
  async init(uid: UID, userName: string, client: IAgoraRTCClient): Promise<void> {
    this.currentUserUid = uid;
    this.currentUserName = userName;
    this.agoraClient = client;
    this.messages = [];
    
    // In Agora SDK NG v4.x, data streams are created on-demand when sending
    // We just need to set up the listener and mark as ready
    this.dataStreamId = 1; // Dummy ID to indicate ready (actual ID assigned on first send)
    
    // Listen for incoming data stream messages
    this.setupDataStreamListener();
    
    console.log('💬 Chat service initialized with network messaging');
    console.log('📡 Data stream ready (SDK NG v4.x)');
  }
  
  /**
   * Setup listener for incoming data stream messages
   */
  private setupDataStreamListener(): void {
    if (!this.agoraClient) return;
    
    // Use type assertion as SDK NG types don't include stream-message event yet
    (this.agoraClient as any).on('stream-message', (uid: UID, _streamId: number, data: Uint8Array) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(data));
        if (message.type === 'chat') {
          this.receiveMessage(uid, message.userName, message.text);
        }
      } catch (error) {
        console.error('Failed to parse chat message:', error);
      }
    });
    
    console.log('📡 Stream message listener attached');
  }

  /**
   * Send a message via Agora data stream
   */
  async sendMessage(message: string): Promise<AgoraChatMessage> {
    if (!this.currentUserUid) {
      throw new Error('Chat not initialized: No user ID');
    }

    // ALWAYS create and store message locally first (so user sees it)
    const chatMessage: AgoraChatMessage = {
      id: Date.now().toString() + Math.random(),
      sender: {
        uid: this.currentUserUid,
        name: this.currentUserName,
      },
      message: message.trim(),
      timestamp: Date.now(),
    };

    // Add to local messages and emit event (ALWAYS happens)
    this.messages.push(chatMessage);
    this.emit('message', chatMessage);
    console.log('💬 Message added locally:', message.substring(0, 30));

    // Try to send via Agora data stream to all remote users
    // If this fails, message is still visible locally
    if (this.agoraClient && this.dataStreamId !== null) {
      try {
        const payload = JSON.stringify({
          type: 'chat',
          userName: this.currentUserName,
          text: message.trim(),
        });
        
        const encodedPayload = new TextEncoder().encode(payload);
        
        // Send as stream message using Agora SDK NG v4.x API
        // Use type assertion as TypeScript definitions don't include this method yet
        await (this.agoraClient as any).sendStreamMessage(encodedPayload, {
          syncWithAudio: false,
        });
        
        console.log('💬 Message sent to network:', message.substring(0, 30));
      } catch (error: any) {
        console.error('Failed to send chat message over network:', error);
        console.warn('⚠️ Message is local-only (network send failed)');
        
        // Provide more specific error info
        if (error.code === 'INVALID_OPERATION') {
          console.warn('💡 Tip: Ensure you have published at least one track before sending messages');
        }
      }
    } else {
      console.warn('⚠️ Data stream not available - message is local-only');
    }

    return chatMessage;
  }

  /**
   * Receive a message (simulate receiving from remote user)
   * In production, this would be called when RTM message is received
   */
  receiveMessage(uid: UID, userName: string, message: string): AgoraChatMessage {
    const chatMessage: AgoraChatMessage = {
      id: Date.now().toString() + Math.random(),
      sender: {
        uid,
        name: userName,
      },
      message: message.trim(),
      timestamp: Date.now(),
    };

    this.messages.push(chatMessage);
    this.emit('message', chatMessage);

    console.log('💬 Message received from:', userName);
    return chatMessage;
  }

  /**
   * Get all messages
   */
  getMessages(): AgoraChatMessage[] {
    return [...this.messages];
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
    this.currentUserUid = null;
    this.currentUserName = '';
    this.agoraClient = null;
    this.dataStreamId = null;
  }

  /**
   * Event emitter - on
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Event emitter - off
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Event emitter - emit
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const chatService = new ChatService();
