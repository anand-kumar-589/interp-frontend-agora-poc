/**
 * Agora Video SDK Configuration
 * 
 * ⚠️ SECURITY WARNING ⚠️
 * This configuration is for LOCAL TESTING/POC ONLY
 * DO NOT deploy this to production or public repositories
 * 
 * How to get FREE credentials:
 * 1. Sign up: https://www.agora.io/
 * 2. Go to Console: https://console.agora.io/
 * 3. Click "Project Management" → "Create"
 * 4. Create project: "Video Call POC"
 * 5. Copy your App ID
 * 6. (Optional) Enable App Certificate for security
 * 
 * Free Tier:
 * - 10,000 minutes per month (FREE!)
 * - Unlimited participants
 * - HD video quality
 * - All features included
 * - No credit card required
 */

export type CallMode = 'rtc' | 'live';
export type CallType = 'VRI' | 'OPI'; // VRI = Video Call, OPI = Audio-only Call
export type ViewMode = 'gallery' | 'speaker';
export type ThemeMode = 'light' | 'dark';
export type VideoProfile = '120p' | '240p' | '360p' | '480p' | '720p' | '1080p';
export type AudioQuality = 'high' | 'standard' | 'low';

export interface AgoraConfig {
  // App Credentials (Get from https://console.agora.io/)
  appId: string;
  appCertificate?: string; // Optional, for production security
  
  // Call Mode
  mode: CallMode; // 'rtc' = video call, 'live' = live streaming
  
  // Call Type (VRI vs OPI)
  callType: CallType; // 'VRI' = Video Call, 'OPI' = Audio-only Call
  
  // Channel Settings
  channelConfig: {
    channelName: string; // Will be set by user in UI
    token: string | null; // For token-based auth (optional)
    uid: number | null; // User ID (null = auto-assign)
  };
  
  // Features Toggle
  features: {
    screenShare: boolean;
    chat: boolean;
    recording: boolean;
    virtualBackground: boolean;
    beautyFilter: boolean;
  };
  
  // UI Preferences
  ui: {
    defaultView: ViewMode;
    theme: ThemeMode;
    showParticipantCount: boolean;
    showNetworkQuality: boolean;
  };
  
  // Video/Audio Settings
  media: {
    videoEnabled: boolean;
    audioEnabled: boolean;
    videoProfile: VideoProfile; // Resolution
    frameRate: 15 | 24 | 30;
    codec: 'vp8' | 'h264';
    audioQuality: AudioQuality; // Audio quality for OPI calls
  };
}

export const AGORA_CONFIG: AgoraConfig = {
  // ⬇️ PASTE YOUR AGORA APP ID HERE ⬇️
  appId: '605057320c234494a56a3b784548ae7e',
  appCertificate: 'cb2817a90e0c43dd840c1bc4985fe31e', // ✅ Enabled for token authentication
  
  // Call Mode
  mode: 'rtc', // Real-time communication (video call)
  
  // Call Type (Will be set by user in UI)
  callType: 'VRI', // Default to VRI (will be changed by user)
  
  // Channel Configuration
  channelConfig: {
    channelName: '', // Will be set by user in UI
    token: '', // ✅ Token is now generated dynamically from backend
    uid: null, // Auto-assign user ID
  },
  
  // Feature Flags
  features: {
    screenShare: true,
    chat: true,
    recording: false, // May require cloud recording setup
    virtualBackground: true,
    beautyFilter: false, // Extension feature
  },
  
  // UI Settings
  ui: {
    defaultView: 'gallery',
    theme: 'light',
    showParticipantCount: true,
    showNetworkQuality: true,
  },
  
  // Media Settings
  media: {
    videoEnabled: true,
    audioEnabled: true,
    videoProfile: '720p', // HD quality
    frameRate: 30,
    codec: 'vp8', // Better browser compatibility
    audioQuality: 'standard', // standard = 16kHz, ~32 kbps (phone call quality)
  },
};

/**
 * Validation function to check if App ID is configured
 */
export function validateAgoraConfig(): boolean {
  const config = AGORA_CONFIG;
  
  if (
    !config.appId ||
    config.appId === 'YOUR_AGORA_APP_ID_HERE' ||
    config.appId.includes('xxx') ||
    config.appId.length < 10
  ) {
    console.error('❌ AGORA CONFIG ERROR: Please update agora.config.ts with your actual App ID');
    console.log('📖 Get FREE App ID from: https://console.agora.io/');
    console.log('📚 See AGORA-CREDENTIALS-GUIDE.md for instructions');
    return false;
  }
  
  console.log('✅ Agora configuration validated');
  console.log(`📹 App ID: ${config.appId.substring(0, 8)}...`);
  console.log(`🎨 Theme: ${config.ui.theme}`);
  console.log(`📺 Video: ${config.media.videoProfile}@${config.media.frameRate}fps`);
  return true;
}

/**
 * Video profile resolution mapping
 */
export const VIDEO_PROFILES = {
  '120p': { width: 160, height: 120 },
  '240p': { width: 320, height: 240 },
  '360p': { width: 640, height: 360 },
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
};

/**
 * Audio quality profiles for OPI (audio-only) calls
 */
export const AUDIO_QUALITY_PROFILES = {
  high: {
    sampleRate: 48000,
    bitrate: 50,
    description: 'High quality (music streaming)',
  },
  standard: {
    sampleRate: 16000,
    bitrate: 32,
    description: 'Standard quality (phone call)',
  },
  low: {
    sampleRate: 8000,
    bitrate: 24,
    description: 'Low quality (minimal bandwidth)',
  },
};
