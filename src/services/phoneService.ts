import * as signalR from '@microsoft/signalr';
import backendConfig from '../config/backend.config';

export interface PhoneParticipant {
  callSid: string;
  phoneNumber: string;
  status: string;
}

class PhoneService {
  private connection: signalR.HubConnection | null = null;
  private serverUrl = backendConfig.baseUrl;

  /**
   * Connect to SignalR hub and join channel
   */
  async connect(channelName: string): Promise<void> {
    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${this.serverUrl}/phonehub`, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents
        })
        .withAutomaticReconnect()
        .build();

      await this.connection.start();
      await this.connection.invoke('JoinChannel', channelName);
      
      console.log('✅ Connected to phone hub for channel:', channelName);
    } catch (error) {
      console.error('❌ Failed to connect to phone hub:', error);
      throw error;
    }
  }

  /**
   * Disconnect from SignalR hub
   */
  async disconnect(channelName: string): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.invoke('LeaveChannel', channelName);
        await this.connection.stop();
        console.log('✅ Disconnected from phone hub');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from phone hub:', error);
    }
  }

  /**
   * Dial a phone number
   */
  async dialPhone(
    channelName: string, 
    phoneNumber: string, 
    callType: string,
    callerName?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/dial-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          channelName, 
          phoneNumber, 
          callType,
          callerName: callerName || 'Unknown'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to dial phone');
      }

      const data = await response.json();
      console.log('📞 Dialing phone:', data);
      return data;
    } catch (error) {
      console.error('❌ Error dialing phone:', error);
      throw error;
    }
  }

  /**
   * Hang up a phone call
   */
  async hangupPhone(channelName: string, callSid: string): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/hangup-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName, callSid })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to hang up phone');
      }

      const data = await response.json();
      console.log('📵 Hung up phone:', data);
      return data;
    } catch (error) {
      console.error('❌ Error hanging up phone:', error);
      throw error;
    }
  }

  /**
   * Get phone participants for a channel
   */
  async getPhoneParticipants(channelName: string): Promise<PhoneParticipant[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/phone-participants/${channelName}`);
      
      if (!response.ok) {
        throw new Error('Failed to get phone participants');
      }

      const data = await response.json();
      return data.participants || [];
    } catch (error) {
      console.error('❌ Error getting phone participants:', error);
      return [];
    }
  }

  /**
   * Event: Phone is dialing (ringing)
   */
  onPhoneDialing(callback: (data: any) => void): void {
    this.connection?.on('PhoneDialing', callback);
  }

  /**
   * Event: Phone call connected
   */
  onPhoneConnected(callback: (data: any) => void): void {
    this.connection?.on('PhoneConnected', callback);
  }

  /**
   * Event: Phone call disconnected
   */
  onPhoneDisconnected(callback: (data: any) => void): void {
    this.connection?.on('PhoneDisconnected', callback);
  }

  /**
   * Event: Phone status changed
   */
  onPhoneStatusChanged(callback: (data: any) => void): void {
    this.connection?.on('PhoneStatusChanged', callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.connection?.off('PhoneDialing');
    this.connection?.off('PhoneConnected');
    this.connection?.off('PhoneDisconnected');
    this.connection?.off('PhoneStatusChanged');
  }
}

export const phoneService = new PhoneService();
