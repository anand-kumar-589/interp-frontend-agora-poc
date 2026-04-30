/**
 * Agora Video SDK Type Definitions
 */

import type { UID } from 'agora-rtc-sdk-ng';

export interface AgoraUser {
  uid: UID;
  hasAudio: boolean;
  hasVideo: boolean;
  audioTrack?: any;
  videoTrack?: any;
}

export interface AgoraChatMessage {
  id: string;
  sender: {
    uid: UID;
    name: string;
  };
  message: string;
  timestamp: number;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

export interface ChannelInfo {
  channelName: string;
  hostUid?: UID;
  participantCount: number;
  isHost: boolean;
}

export interface NetworkQuality {
  uplinkNetworkQuality: number; // 0-6 (0=unknown, 1=excellent, 6=down)
  downlinkNetworkQuality: number;
}

export interface AgoraStats {
  duration: number;
  sendBitrate: number;
  sendBytes: number;
  recvBitrate: number;
  recvBytes: number;
  users: number;
}

export interface AgoraError {
  type: 'INIT' | 'JOIN' | 'PUBLISH' | 'SUBSCRIBE' | 'MEDIA' | 'NETWORK' | 'PERMISSION' | 'GENERIC';
  message: string;
  code?: string | number;
}

export type ConnectionState = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'RECONNECTING' 
  | 'DISCONNECTING';

export type UserRole = 'host' | 'audience';
