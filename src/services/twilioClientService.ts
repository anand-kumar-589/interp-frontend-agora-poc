import { Device, Call } from '@twilio/voice-sdk';
import backendConfig from '../config/backend.config';

export interface AudioBridgeConfig {
  mode: 'TwilioClient' | 'Loopback';
  enableLoopback: boolean;
  available: boolean;
}

class TwilioClientService {
  private device: Device | null = null;
  private call: Call | null = null;
  private backendUrl = backendConfig.baseUrl;
  private customAudioStream: MediaStream | null = null;

  /**
   * Initialize Twilio Device with access token
   */
  async initialize(token: string): Promise<void> {
    try {
      // Override getUserMedia to use our custom audio stream if available
      const getUserMediaOverride = async (constraints: MediaStreamConstraints) => {
        if (this.customAudioStream && constraints.audio) {
          console.log('🎤 Using custom Agora audio stream for Twilio');
          return this.customAudioStream;
        }
        // Fallback to default microphone
        return navigator.mediaDevices.getUserMedia(constraints);
      };

      this.device = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        edge: 'ashburn',
        // @ts-ignore - Override getUserMedia
        getUserMedia: getUserMediaOverride,
      });

      this.device.on('registered', () => {
        console.log('✅ Twilio Device registered for audio bridge');
      });

      this.device.on('error', (error) => {
        console.error('❌ Twilio Device error:', error);
      });

      await this.device.register();
    } catch (error) {
      console.error('Failed to initialize Twilio Device:', error);
      throw error;
    }
  }

  /**
   * Get audio bridge configuration from backend
   */
  async getAudioBridgeConfig(): Promise<AudioBridgeConfig> {
    try {
      const response = await fetch(`${this.backendUrl}/api/audio-bridge-config`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to get audio bridge config:', error);
      return { mode: 'TwilioClient', enableLoopback: false, available: false };
    }
  }

  /**
   * Join Twilio conference with Agora audio
   */
  async joinConference(
    conferenceName: string,
    agoraAudioTrack: MediaStreamTrack
  ): Promise<void> {
    if (!this.device) {
      throw new Error('Twilio Device not initialized');
    }

    try {
      // Create MediaStream with Agora audio track and store it
      // The getUserMedia override will use this stream
      this.customAudioStream = new MediaStream([agoraAudioTrack]);

      console.log('🎤 Custom Agora audio stream ready for Twilio');

      // Make outbound call to conference
      // The getUserMedia override will automatically use our custom stream
      // Specify the URL where Twilio will fetch TwiML instructions
      this.call = await this.device.connect({
        rtcConfiguration: {
          iceServers: [],
        },
        params: {
          To: conferenceName,
        },
      });

      console.log(`✅ Joined Twilio conference: ${conferenceName} with Agora audio`);

      this.call.on('disconnect', () => {
        console.log('🔌 Disconnected from Twilio conference');
        this.call = null;
        this.customAudioStream = null;
      });
    } catch (error) {
      console.error('Failed to join conference:', error);
      this.customAudioStream = null;
      throw error;
    }
  }

  /**
   * Leave Twilio conference
   */
  async leaveConference(): Promise<void> {
    if (this.call) {
      this.call.disconnect();
      this.call = null;
      this.customAudioStream = null;
      console.log('👋 Left Twilio conference');
    }
  }

  /**
   * Check if currently in conference
   */
  isInConference(): boolean {
    return this.call !== null && this.call.status() === Call.State.Open;
  }

  /**
   * Cleanup and destroy device
   */
  destroy(): void {
    this.leaveConference();
    
    if (this.device) {
      this.device.unregister();
      this.device.destroy();
      this.device = null;
      console.log('🧹 Twilio Device destroyed');
    }
  }
}

export const twilioClientService = new TwilioClientService();
