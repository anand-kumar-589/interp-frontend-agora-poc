import backendConfig from '../config/backend.config';

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  expiresIn: number;
}

class AgoraTokenService {
  private backendUrl = backendConfig.baseUrl;

  /**
   * Request a new Agora RTC token from the backend
   */
  async requestToken(channelName: string, uid: number = 0): Promise<AgoraTokenResponse> {
    try {
      console.log(`🎫 Requesting Agora token for channel: ${channelName}, UID: ${uid}`);
      
      const response = await fetch(`${this.backendUrl}/api/agora-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true', // Skip ngrok warning page
        },
        body: JSON.stringify({
          channelName,
          uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AgoraTokenResponse = await response.json();
      
      console.log('✅ Agora token received:', {
        channelName: data.channelName,
        uid: data.uid,
        expiresIn: `${data.expiresIn / 3600} hours`,
        tokenLength: data.token.length,
      });

      return data;
    } catch (error) {
      console.error('❌ Failed to request Agora token:', error);
      throw error;
    }
  }

  /**
   * Validate token format
   */
  isValidToken(token: string): boolean {
    if (!token || token.length < 10) {
      return false;
    }
    // Agora tokens start with version (006 or 007)
    return token.startsWith('007') || token.startsWith('006');
  }
}

export const agoraTokenService = new AgoraTokenService();
export default agoraTokenService;
