import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
  UID,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG, VIDEO_PROFILES } from '../config/agora.config';
import type { NetworkQuality } from '../types/agora.types';
import { agoraTokenService } from './agoraTokenService';

/**
 * Agora RTC Service
 * Manages Agora Video SDK client and operations
 */

class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localScreenTrack: ILocalVideoTrack | null = null;
  private currentChannel: string = '';
  private currentUid: UID | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private remoteUsers: Map<UID, IAgoraRTCRemoteUser> = new Map();

  /**
   * Initialize Agora RTC Client
   */
  async init(): Promise<void> {
    try {
      console.log('🚀 Initializing Agora RTC SDK...');
      
      // Create client
      this.client = AgoraRTC.createClient({
        mode: AGORA_CONFIG.mode,
        codec: AGORA_CONFIG.media.codec,
      });

      // Set up event listeners
      this.setupEventListeners();

      console.log('✅ Agora RTC SDK initialized');
      console.log(`   Mode: ${AGORA_CONFIG.mode}`);
      console.log(`   Codec: ${AGORA_CONFIG.media.codec}`);
    } catch (error) {
      console.error('❌ Failed to initialize Agora SDK:', error);
      throw new Error('Failed to initialize Agora RTC SDK');
    }
  }

  /**
   * Fetch RTC token from backend server
   */
  // private async fetchToken(channelName: string, uid: number = 0): Promise<string> {
  //   const TOKEN_SERVER_URL = 'http://localhost:3001';
    
  //   try {
  //     console.log('🔑 Fetching token from server...');
  //     const response = await fetch(
  //       `${TOKEN_SERVER_URL}/rtc-token?channelName=${encodeURIComponent(channelName)}&uid=${uid}`
  //     );
      
  //     if (!response.ok) {
  //       throw new Error(`Token server responded with ${response.status}`);
  //     }
      
  //     const data = await response.json();
  //     console.log('✅ Token received');
  //     console.log(`   Expires: ${data.expiresIn}`);
      
  //     return data.token;
  //   } catch (error: any) {
  //     console.error('❌ Failed to fetch token:', error);
  //     throw new Error(
  //       'Failed to get token from server. Make sure token server is running on http://localhost:3001'
  //     );
  //   }
  // }

  /**
   * Join a channel
   * @param channelName - Name of the channel to join
   * @param audioOnly - If true, only audio track will be published (OPI mode)
   * @param uid - Optional user ID
   */
  async join(channelName: string, audioOnly = false, uid?: UID): Promise<UID> {
    if (!this.client) {
      throw new Error('Agora client not initialized. Call init() first.');
    }

    try {
      console.log('🔗 Joining channel...');
      console.log(`   Channel: ${channelName}`);
      console.log(`   Mode: ${audioOnly ? 'OPI (Audio-only)' : 'VRI (Video + Audio)'}`);
      console.log(`   UID: ${uid || 'auto-assign'}`);

      // Fetch token dynamically from backend
      console.log('🎫 Requesting dynamic token from backend...');
      const tokenData = await agoraTokenService.requestToken(channelName, uid ? Number(uid) : 0);
      const token = tokenData.token;
      
      console.log('✅ Dynamic token received');
      console.log(`   Token: ${token.substring(0, 32)}...`);
      console.log(`   Expires in: ${tokenData.expiresIn / 3600} hours`);

      // Join the channel with dynamic token
      const assignedUid = await this.client.join(
        AGORA_CONFIG.appId,
        channelName,
        token,
        uid || null
      );

      this.currentChannel = channelName;
      this.currentUid = assignedUid;

      console.log('✅ Successfully joined channel');
      console.log(`   Assigned UID: ${assignedUid}`);

      return assignedUid;
    } catch (error: any) {
      console.error('❌ Failed to join channel:', error);
      throw new Error(`Failed to join: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Leave current channel
   */
  async leave(): Promise<void> {
    if (!this.client) return;

    try {
      console.log('👋 Leaving channel...');

      // Unpublish and stop local tracks
      await this.unpublishTracks();
      await this.stopLocalTracks();

      // Leave channel
      await this.client.leave();

      this.currentChannel = '';
      this.currentUid = null;
      this.remoteUsers.clear();

      console.log('✅ Left channel successfully');
    } catch (error) {
      console.error('❌ Error leaving channel:', error);
    }
  }

  /**
   * Create and publish local video track
   */
  async createAndPublishVideoTrack(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      if (!this.localVideoTrack) {
        console.log('📹 Creating video track...');
        
        const profile = VIDEO_PROFILES[AGORA_CONFIG.media.videoProfile];
        
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: profile.width,
            height: profile.height,
            frameRate: AGORA_CONFIG.media.frameRate,
            bitrateMin: 600,
            bitrateMax: 2000,
          },
        });

        console.log('✅ Video track created');
      }

      await this.client.publish([this.localVideoTrack]);
      console.log('✅ Video track published');
    } catch (error) {
      console.error('❌ Failed to create/publish video track:', error);
      throw error;
    }
  }

  /**
   * Create and publish local audio track
   */
  async createAndPublishAudioTrack(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      if (!this.localAudioTrack) {
        console.log('🎤 Creating audio track...');
        
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'music_standard',
        });

        console.log('✅ Audio track created');
      }

      await this.client.publish([this.localAudioTrack]);
      console.log('✅ Audio track published');
    } catch (error) {
      console.error('❌ Failed to create/publish audio track:', error);
      throw error;
    }
  }

  /**
   * Toggle video on/off
   */
  async toggleVideo(enable: boolean): Promise<void> {
    try {
      if (enable) {
        await this.createAndPublishVideoTrack();
      } else {
        if (this.localVideoTrack && this.client) {
          // IMPORTANT: Unpublish first, then stop/close
          await this.client.unpublish([this.localVideoTrack]);
          this.localVideoTrack.stop();
          this.localVideoTrack.close();
          this.localVideoTrack = null;
          console.log('📹 Video unpublished and stopped');
        }
      }
    } catch (error) {
      console.error('❌ Failed to toggle video:', error);
      throw error;
    }
  }

  /**
   * Toggle audio on/off
   */
  async toggleAudio(enable: boolean): Promise<void> {
    try {
      if (enable) {
        await this.createAndPublishAudioTrack();
      } else {
        if (this.localAudioTrack && this.client) {
          // IMPORTANT: Unpublish first, then stop/close
          await this.client.unpublish([this.localAudioTrack]);
          this.localAudioTrack.stop();
          this.localAudioTrack.close();
          this.localAudioTrack = null;
          console.log('🎤 Audio unpublished and stopped');
        }
      }
    } catch (error) {
      console.error('❌ Failed to toggle audio:', error);
      throw error;
    }
  }

  /**
   * Mute/unmute audio (without stopping track)
   */
  async muteAudio(mute: boolean): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(!mute);
      console.log(mute ? '🔇 Audio muted' : '🔊 Audio unmuted');
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      console.log('🖥️ Starting screen share...');

      // Stop camera video if active
      if (this.localVideoTrack) {
        await this.client.unpublish([this.localVideoTrack]);
      }

      // Create screen track (can return single track or array with audio)
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: '1080p_1',
      });
      
      // Handle both single track and array return types
      if (Array.isArray(screenTrack)) {
        this.localScreenTrack = screenTrack[0];
        await this.client.publish(screenTrack);
      } else {
        this.localScreenTrack = screenTrack;
        await this.client.publish([this.localScreenTrack]);
      }

      console.log('✅ Screen sharing started');
    } catch (error: any) {
      console.error('❌ Failed to start screen share:', error);
      
      // Re-publish camera if screen share failed
      if (this.localVideoTrack) {
        await this.client!.publish([this.localVideoTrack]);
      }
      
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.client || !this.localScreenTrack) return;

    try {
      console.log('🖥️ Stopping screen share...');

      // Unpublish and stop screen track
      await this.client.unpublish([this.localScreenTrack]);
      this.localScreenTrack.stop();
      this.localScreenTrack.close();
      this.localScreenTrack = null;

      // Re-publish camera video if it was active
      if (this.localVideoTrack) {
        await this.client.publish([this.localVideoTrack]);
      }

      console.log('✅ Screen sharing stopped');
    } catch (error) {
      console.error('❌ Failed to stop screen share:', error);
    }
  }

  /**
   * Get local video track for playback
   */
  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  /**
   * Get local screen track for playback
   */
  getLocalScreenTrack(): ILocalVideoTrack | null {
    return this.localScreenTrack;
  }

  /**
   * Get local audio track for audio bridge
   */
  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  /**
   * Get remote users
   */
  getRemoteUsers(): IAgoraRTCRemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  /**
   * Play remote video track
   */
  playRemoteVideo(uid: UID, elementId: string): void {
    const user = this.remoteUsers.get(uid);
    if (user && user.videoTrack) {
      user.videoTrack.play(elementId);
    }
  }

  /**
   * Get current channel name
   */
  getCurrentChannel(): string {
    return this.currentChannel;
  }

  /**
   * Get current UID
   */
  getCurrentUid(): UID | null {
    return this.currentUid;
  }

  /**
   * Get Agora client instance
   */
  getClient(): IAgoraRTCClient | null {
    return this.client;
  }

  /**
   * Check if in channel
   */
  isInChannel(): boolean {
    return !!this.currentChannel;
  }

  /**
   * Get network quality
   */
  getNetworkQuality(): NetworkQuality | null {
    if (!this.client) return null;
    
    const stats = this.client.getRTCStats();
    return {
      uplinkNetworkQuality: stats.OutgoingAvailableBandwidth || 0,
      downlinkNetworkQuality: stats.RecvBitrate || 0,
    };
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // User joined
    this.client.on('user-joined', (user) => {
      console.log('👤 User joined:', user.uid);
      this.remoteUsers.set(user.uid, user);
      this.emit('user-joined', user);
    });

    // User left
    this.client.on('user-left', (user, reason) => {
      console.log('👋 User left:', user.uid, 'Reason:', reason);
      this.remoteUsers.delete(user.uid);
      this.emit('user-left', { user, reason });
    });

    // User published (started sending media)
    this.client.on('user-published', async (user, mediaType) => {
      console.log('📡 User published:', user.uid, mediaType);
      
      // Subscribe to the user's track
      await this.client!.subscribe(user, mediaType);
      console.log('✅ Subscribed to', user.uid, mediaType);
      
      // IMPORTANT: Play audio track immediately after subscription
      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.play();
        console.log('🔊 Playing audio for user:', user.uid);
      }
      
      this.remoteUsers.set(user.uid, user);
      this.emit('user-published', { user, mediaType });
    });

    // User unpublished (stopped sending media)
    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('📴 User unpublished:', user.uid, mediaType);
      this.emit('user-unpublished', { user, mediaType });
    });

    // Connection state changed
    this.client.on('connection-state-change', (curState, prevState, reason) => {
      console.log('🔗 Connection state:', curState, '(was:', prevState, ')');
      this.emit('connection-state-change', { curState, prevState, reason });
    });

    // Network quality
    this.client.on('network-quality', (stats) => {
      this.emit('network-quality', stats);
    });
  }

  /**
   * Unpublish all local tracks
   */
  private async unpublishTracks(): Promise<void> {
    if (!this.client) return;

    const tracks = [];
    if (this.localVideoTrack) tracks.push(this.localVideoTrack);
    if (this.localAudioTrack) tracks.push(this.localAudioTrack);
    if (this.localScreenTrack) tracks.push(this.localScreenTrack);

    if (tracks.length > 0) {
      await this.client.unpublish(tracks);
    }
  }

  /**
   * Stop all local tracks
   */
  private async stopLocalTracks(): Promise<void> {
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack.close();
      this.localVideoTrack = null;
    }

    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack.close();
      this.localAudioTrack = null;
    }

    if (this.localScreenTrack) {
      this.localScreenTrack.stop();
      this.localScreenTrack.close();
      this.localScreenTrack = null;
    }
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

export const agoraService = new AgoraService();
