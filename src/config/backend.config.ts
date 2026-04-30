/**
 * Backend API Configuration
 * 
 * Set VITE_BACKEND_URL environment variable to override
 * Example: VITE_BACKEND_URL=https://your-ngrok-url.ngrok-free.app
 */

// Get backend URL from environment variable or use default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const backendConfig = {
  baseUrl: BACKEND_URL,
  
  // API Endpoints
  endpoints: {
    agoraToken: `${BACKEND_URL}/api/agora-token`,
    dialPhone: `${BACKEND_URL}/api/dial-phone`,
    hangupPhone: `${BACKEND_URL}/api/hangup-phone`,
    phoneParticipants: `${BACKEND_URL}/api/phone-participants`,
    twilioToken: `${BACKEND_URL}/api/twilio-token`,
    audioBridgeConfig: `${BACKEND_URL}/api/audio-bridge-config`,
  },
  
  // SignalR Hubs
  hubs: {
    phone: `${BACKEND_URL}/phonehub`,
  },
};

// Log the backend URL being used
console.log('🌐 Backend URL:', BACKEND_URL);

export default backendConfig;
