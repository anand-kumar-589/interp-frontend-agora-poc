/**
 * Agora Token Generation Utility
 * 
 * WARNING: This is CLIENT-SIDE token generation for TESTING ONLY
 * For production, tokens MUST be generated on a secure backend server
 * 
 * Install required package:
 * npm install agora-access-token
 */

import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { AGORA_CONFIG } from '../config/agora.config';

/**
 * Generate RTC Token for channel access
 * 
 * @param channelName - The channel name to join
 * @param uid - User ID (0 for auto-assign)
 * @param role - User role (host or audience)
 * @param expirationTimeInSeconds - Token validity duration (default: 3600s = 1 hour)
 * @returns Generated token string
 */
export function generateRtcToken(
  channelName: string,
  uid: number = 0,
  role: 'host' | 'audience' = 'host',
  expirationTimeInSeconds: number = 3600
): string {
  const appId = AGORA_CONFIG.appId;
  const appCertificate = AGORA_CONFIG.appCertificate;

  if (!appCertificate) {
    console.warn('⚠️ App Certificate not configured. Token generation skipped.');
    return '';
  }

  // Calculate token expiration timestamp
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Build token
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
    privilegeExpiredTs
  );

  console.log('🔑 Token generated successfully');
  console.log(`   Channel: ${channelName}`);
  console.log(`   UID: ${uid || 'auto-assign'}`);
  console.log(`   Expires in: ${expirationTimeInSeconds}s`);

  return token;
}

/**
 * Generate token for testing (short expiration)
 */
export function generateTestToken(channelName: string, uid: number = 0): string {
  return generateRtcToken(channelName, uid, 'host', 3600); // 1 hour
}

/**
 * Generate token for production (longer expiration)
 */
export function generateProductionToken(channelName: string, uid: number = 0): string {
  return generateRtcToken(channelName, uid, 'host', 86400); // 24 hours
}
