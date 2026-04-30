import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  message,
  Switch,
  Badge,
  Tooltip,
  Drawer,
  List,
  Avatar,
} from 'antd';
import {
  VideoCameraOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  DesktopOutlined,
  UserOutlined,
  PoweroffOutlined,
  CopyOutlined,
  BulbOutlined,
  TeamOutlined,
  VideoCameraFilled,
  PhoneOutlined,
  PhoneFilled,
} from '@ant-design/icons';
import { agoraService } from '../../services/agoraService';
import { chatService } from '../../services/chatService';
import { phoneService } from '../../services/phoneService';
import { twilioClientService } from '../../services/twilioClientService';
import type { PhoneParticipant } from '../../services/phoneService';
import VideoGrid from '../VideoGrid/VideoGrid';
import CallTypeSelector from '../CallTypeSelector/CallTypeSelector';
import DialPhoneModal from '../DialPhoneModal/DialPhoneModal';
import type { CallType } from '../../config/agora.config';
import backendConfig from '../../config/backend.config';
import './VideoHost.css';

const { Title, Text } = Typography;

interface VideoHostProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const VideoHost: React.FC<VideoHostProps> = ({ isDarkMode, onToggleTheme }) => {
  const [channelName, setChannelName] = useState('');
  const [userName, setUserName] = useState('');
  const [callType, setCallType] = useState<CallType>('VRI'); // VRI or OPI
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInChannel, setIsInChannel] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState('');
  const [currentUid, setCurrentUid] = useState<number | null>(null);
  
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [showParticipants, setShowParticipants] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [phoneParticipants, setPhoneParticipants] = useState<PhoneParticipant[]>([]);
  const [showDialModal, setShowDialModal] = useState(false);
  
  // Audio bridge state
  const [isAudioBridgeActive, setIsAudioBridgeActive] = useState(false);
  const [audioBridgeMode, setAudioBridgeMode] = useState<'TwilioClient' | 'Loopback'>('TwilioClient');
  
  const localVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeAgora();
    return () => {
      if (isInChannel) {
        handleLeaveChannel();
      }
    };
  }, []);

  useEffect(() => {
    if (!isInChannel) return;

    const handleUserJoined = () => {
      updateRemoteUsers();
    };

    const handleUserLeft = () => {
      updateRemoteUsers();
    };

    const handleUserPublished = () => {
      updateRemoteUsers();
    };

    const handleUserUnpublished = () => {
      updateRemoteUsers();
    };

    agoraService.on('user-joined', handleUserJoined);
    agoraService.on('user-left', handleUserLeft);
    agoraService.on('user-published', handleUserPublished);
    agoraService.on('user-unpublished', handleUserUnpublished);

    return () => {
      agoraService.off('user-joined', handleUserJoined);
      agoraService.off('user-left', handleUserLeft);
      agoraService.off('user-published', handleUserPublished);
      agoraService.off('user-unpublished', handleUserUnpublished);
    };
  }, [isInChannel]);

  // Phone service integration
  useEffect(() => {
    if (!isInChannel || !currentChannelId) return;

    // Connect to phone hub
    phoneService.connect(currentChannelId).catch((error) => {
      console.error('Failed to connect to phone service:', error);
    });

    // Listen for phone events
    phoneService.onPhoneDialing((data) => {
      console.log('📞 Phone dialing:', data);
      // Add participant immediately with "ringing" status
      setPhoneParticipants((prev) => [
        ...prev,
        {
          callSid: data.callSid,
          phoneNumber: data.phoneNumber,
          status: 'ringing',
        },
      ]);
      message.info(`Calling ${data.phoneNumber}...`);
    });

    phoneService.onPhoneConnected((data) => {
      console.log('✅ Phone connected:', data);
      // Update participant status to "connected"
      setPhoneParticipants((prev) =>
        prev.map((p) =>
          p.callSid === data.callSid
            ? { ...p, status: 'connected' }
            : p
        )
      );
      message.success(`${data.phoneNumber} connected!`);
      
      // Auto-activate audio bridge when phone connects
      // Use setTimeout to ensure Twilio Device is initialized
      setTimeout(async () => {
        try {
          // Check if audio bridge is already active
          if (twilioClientService.isInConference()) {
            console.log('📞 Audio bridge already active');
            return;
          }
          
          // Get current audio track
          const audioTrack = agoraService.getLocalAudioTrack();
          if (!audioTrack) {
            console.log('⚠️ No audio track available for bridge');
            return;
          }
          
          const mediaStreamTrack = audioTrack.getMediaStreamTrack();
          const conferenceName = `agora-${currentChannelId}`;
          
          await twilioClientService.joinConference(conferenceName, mediaStreamTrack);
          setIsAudioBridgeActive(true);
          message.success('📞 Phone call connected - phone users can hear you!');
          console.log('✅ Auto-activated audio bridge for host');
        } catch (error: any) {
          console.error('Failed to auto-activate audio bridge:', error);
        }
      }, 1500); // Longer delay to ensure Twilio Device is ready
    });

    phoneService.onPhoneDisconnected((data) => {
      console.log('❌ Phone disconnected:', data);
      setPhoneParticipants((prev) =>
        prev.filter((p) => p.callSid !== data.callSid)
      );
      message.info(`${data.phoneNumber} disconnected`);
      
      // Auto-deactivate audio bridge when phone disconnects
      if (twilioClientService.isInConference()) {
        twilioClientService.leaveConference();
        setIsAudioBridgeActive(false);
        console.log('📵 Auto-deactivated audio bridge');
      }
    });

    return () => {
      phoneService.removeAllListeners();
      phoneService.disconnect(currentChannelId).catch(console.error);
    };
  }, [isInChannel, currentChannelId]);

  // Twilio Client SDK initialization for audio bridge
  useEffect(() => {
    if (!isInChannel || !currentChannelId) return;

    const initializeTwilioClient = async () => {
      try {
        // Get audio bridge config
        const config = await twilioClientService.getAudioBridgeConfig();
        setAudioBridgeMode(config.mode);

        if (config.mode === 'TwilioClient' && config.available) {
          // Get Twilio access token
          const response = await fetch(`${backendConfig.baseUrl}/api/twilio-token`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify({
              userName,
              channelName: currentChannelId,
            }),
          });

          if (!response.ok) throw new Error('Failed to get Twilio token');

          const { token } = await response.json();

          // Initialize Twilio Device
          await twilioClientService.initialize(token);

          console.log('✅ Twilio Client SDK initialized for audio bridge');
        } else if (config.enableLoopback) {
          console.log('🔄 Audio loopback mode enabled');
          message.info('Audio bridge: Loopback mode (manual setup required)');
        }
      } catch (error) {
        console.error('Failed to initialize Twilio client:', error);
        message.warning('Audio bridge unavailable - check backend configuration');
      }
    };

    initializeTwilioClient();

    return () => {
      twilioClientService.destroy();
    };
  }, [isInChannel, currentChannelId, userName]);

  // Play local video when DOM ref becomes available (initial mount)
  useEffect(() => {
    if (isInChannel && isVideoOn && localVideoRef.current) {
      // Small delay to ensure track is fully ready
      const timer = setTimeout(() => {
        const videoTrack = agoraService.getLocalVideoTrack();
        if (videoTrack && localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
          console.log('📹 Local video track playing from useEffect');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isInChannel]);

  const initializeAgora = async () => {
    try {
      await agoraService.init();
    } catch (error: any) {
      message.error('Failed to initialize Agora SDK');
    }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim() || !userName.trim()) {
      message.warning('Please enter channel name and your name');
      return;
    }

    setIsConnecting(true);
    try {
      const uid = await agoraService.join(channelName.trim(), callType === 'OPI');
      setCurrentChannelId(channelName.trim());
      setCurrentUid(Number(uid));
      setIsInChannel(true);
      
      // Initialize chat with network messaging
      const client = agoraService.getClient();
      if (client) {
        await chatService.init(uid, userName.trim(), client);
      }
      
      message.success(`${callType} channel created successfully!`);

      // For VRI mode, create video track if enabled
      if (callType === 'VRI' && isVideoOn) {
        await agoraService.createAndPublishVideoTrack();
        // Play video immediately after track is created
        if (localVideoRef.current) {
          const videoTrack = agoraService.getLocalVideoTrack();
          if (videoTrack) {
            videoTrack.play(localVideoRef.current);
            console.log('📹 Local video playing on join');
          }
        }
      }

      if (isAudioOn) {
        await agoraService.createAndPublishAudioTrack();
      }

      updateRemoteUsers();
    } catch (error: any) {
      message.error(`Failed to create channel: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeaveChannel = async () => {
    try {
      await agoraService.leave();
      chatService.clear();
      setIsInChannel(false);
      setCurrentChannelId('');
      setCurrentUid(null);
      setRemoteUsers([]);
      setIsVideoOn(true);
      setIsAudioOn(true);
      setIsScreenSharing(false);
      message.info('Left channel');
    } catch (error: any) {
      message.error(`Failed to leave channel: ${error.message}`);
    }
  };

  const toggleVideo = async () => {
    try {
      const newVideoState = !isVideoOn;
      await agoraService.toggleVideo(newVideoState);
      setIsVideoOn(newVideoState);
      
      // Play video immediately after enabling
      if (newVideoState && localVideoRef.current) {
        const videoTrack = agoraService.getLocalVideoTrack();
        if (videoTrack) {
          videoTrack.play(localVideoRef.current);
          console.log('📹 Local video playing after toggle ON');
        }
      }
    } catch (error: any) {
      message.error('Failed to toggle video');
      console.error('Toggle video error:', error);
    }
  };

  const toggleAudio = async () => {
    try {
      await agoraService.muteAudio(isAudioOn);
      setIsAudioOn(!isAudioOn);
    } catch (error: any) {
      message.error('Failed to toggle audio');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await agoraService.stopScreenShare();
        setIsScreenSharing(false);
        message.success('Screen sharing stopped');
      } else {
        await agoraService.startScreenShare();
        setIsScreenSharing(true);
        message.success('Screen sharing started');
      }
    } catch (error: any) {
      message.error(`Screen share failed: ${error.message}`);
    }
  };

  const toggleAudioBridge = async () => {
    if (isAudioBridgeActive) {
      // Mute audio bridge
      await twilioClientService.leaveConference();
      setIsAudioBridgeActive(false);
      message.info('📵 Phone call muted - phone users cannot hear you');
    } else {
      // Unmute audio bridge
      await startAudioBridge();
    }
  };

  const startAudioBridge = async () => {
    if (!currentChannelId) {
      message.error('Join a channel first');
      return;
    }

    try {
      // Get local audio track from Agora
      const audioTrack = agoraService.getLocalAudioTrack();
      if (!audioTrack) {
        message.error('Audio is off - turn on microphone first');
        return;
      }

      // Get the media stream track
      const mediaStreamTrack = audioTrack.getMediaStreamTrack();

      // Join Twilio conference with Agora audio
      const conferenceName = `agora-${currentChannelId}`;
      await twilioClientService.joinConference(conferenceName, mediaStreamTrack);

      setIsAudioBridgeActive(true);
      message.success('📞 Phone call connected - phone users can hear you!');
    } catch (error: any) {
      console.error('Failed to start audio bridge:', error);
      message.error('Failed to start audio bridge: ' + error.message);
    }
  };

  const handleDialPhone = async (phoneNumber: string) => {
    if (!currentChannelId) return;

    try {
      await phoneService.dialPhone(currentChannelId, phoneNumber, callType, userName);
    } catch (error: any) {
      console.error('Error dialing phone:', error);
      throw error;
    }
  };

  const handleHangupPhone = async (callSid: string) => {
    if (!currentChannelId) return;

    try {
      await phoneService.hangupPhone(currentChannelId, callSid);
      message.success('Phone call ended');
    } catch (error: any) {
      message.error('Failed to hang up phone');
      console.error('Error hanging up phone:', error);
    }
  };

  const updateRemoteUsers = () => {
    const users = agoraService.getRemoteUsers();
    setRemoteUsers(users);
    setParticipantCount(1 + users.length);
  };

  const copyChannelId = () => {
    navigator.clipboard.writeText(currentChannelId);
    message.success('Channel ID copied to clipboard!');
  };

  if (!isInChannel) {
    return (
      <div className="video-host">
        <Card className="join-card" style={{ maxWidth: 500, margin: '100px auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <img src="/logo.svg" alt="Interp Vault" style={{ height: 48, marginBottom: 16 }} />
              <Title level={2}>Interp Vault</Title>
              <Text type="secondary">Video Interpretation Platform</Text>
            </div>

            {/* Call Type Selector */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Call Type</Text>
              <CallTypeSelector value={callType} onChange={setCallType} />
            </div>

            <Input
              size="large"
              placeholder="Channel Name (e.g., my-meeting)"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              prefix={<TeamOutlined />}
            />

            <Input
              size="large"
              placeholder="Your Name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              prefix={<UserOutlined />}
            />

            {/* Pre-join Settings */}
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {/* Show video toggle only for VRI mode */}
              {callType === 'VRI' && (
                <Space>
                  <VideoCameraFilled style={{ color: isVideoOn ? '#FF6B00' : '#999' }} />
                  <Text>Start with video</Text>
                  <Switch checked={isVideoOn} onChange={setIsVideoOn} />
                </Space>
              )}
              <Space>
                <AudioOutlined style={{ color: isAudioOn ? '#FF6B00' : '#999' }} />
                <Text>Start with audio</Text>
                <Switch checked={isAudioOn} onChange={setIsAudioOn} />
              </Space>
            </Space>

            <Button
              type="primary"
              size="large"
              block
              loading={isConnecting}
              onClick={handleCreateChannel}
              icon={callType === 'VRI' ? <VideoCameraOutlined /> : <AudioOutlined />}
            >
              {isConnecting ? 'Connecting...' : 'Create or Join Channel'}
            </Button>

            <div style={{ textAlign: 'center' }}>
              <Space>
                <BulbOutlined />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Theme
                </Text>
                <Switch checked={isDarkMode} onChange={onToggleTheme} />
              </Space>
            </div>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div className="video-host">
      <div className="video-host-topbar">
        {/* Left side: Logo */}
        <div>
          <img src="/logo.svg" alt="Interp Vault" style={{ height: 32 }} />
        </div>

        {/* Right side: Channel info and controls */}
        <Space size="large">
          <Space>
            <Badge count={participantCount} showZero color="#FF6B00">
              <TeamOutlined style={{ fontSize: 20 }} />
            </Badge>
            <div>
              <Text strong style={{ fontSize: 13 }}>{currentChannelId}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Channel ID
              </Text>
            </div>
            <Tooltip title="Copy Channel ID">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={copyChannelId}
              />
            </Tooltip>
          </Space>

          <Space align="center">
            <BulbOutlined style={{ fontSize: 16 }} />
            <Switch checked={isDarkMode} onChange={onToggleTheme} />
          </Space>
        </Space>
      </div>

      <div className="video-container">
        <VideoGrid
          localVideoRef={localVideoRef}
          remoteUsers={remoteUsers}
          isLocalVideoOn={isVideoOn}
          localUserName={userName}
          callType={callType}
          phoneParticipants={phoneParticipants}
          onHangupPhone={handleHangupPhone}
        />
      </div>

      <div className="control-bar">
        <Space size="middle">
          {/* Video toggle - Only show in VRI mode */}
          {callType === 'VRI' && (
            <Tooltip title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}>
              <Button
                shape="circle"
                size="large"
                type={isVideoOn ? 'default' : 'primary'}
                danger={!isVideoOn}
                icon={<VideoCameraOutlined />}
                onClick={toggleVideo}
              />
            </Tooltip>
          )}

          <Tooltip title={isAudioOn ? 'Mute' : 'Unmute'}>
            <Button
              shape="circle"
              size="large"
              type={isAudioOn ? 'default' : 'primary'}
              danger={!isAudioOn}
              icon={isAudioOn ? <AudioOutlined /> : <AudioMutedOutlined />}
              onClick={toggleAudio}
            />
          </Tooltip>

          {/* Screen share - Only show in VRI mode */}
          {callType === 'VRI' && (
            <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
              <Button
                shape="circle"
                size="large"
                type={isScreenSharing ? 'primary' : 'default'}
                icon={<DesktopOutlined />}
                onClick={toggleScreenShare}
              />
            </Tooltip>
          )}

          {/* Chat temporarily hidden - not working */}
          {/* <Tooltip title="Chat">
            <Badge dot={false}>
              <Button
                shape="circle"
                size="large"
                icon={<MessageOutlined />}
                onClick={() => setShowChat(true)}
              />
            </Badge>
          </Tooltip> */}

          {/* Dial Phone */}
          <Tooltip title="Dial Phone">
            <Badge count={phoneParticipants.length} showZero={false} size="small" color="#52c41a">
              <Button
                shape="circle"
                size="large"
                icon={<PhoneOutlined />}
                onClick={() => setShowDialModal(true)}
                style={{ color: phoneParticipants.length > 0 ? '#52c41a' : undefined }}
              />
            </Badge>
          </Tooltip>

          {/* Audio Bridge - Auto-activated when phone connects */}
          {phoneParticipants.length > 0 && audioBridgeMode === 'TwilioClient' && (
            <Tooltip title={isAudioBridgeActive ? 'Phone Call Active - Click to Mute' : 'Phone Call Muted - Click to Unmute'}>
              <Button
                shape="circle"
                size="large"
                type={isAudioBridgeActive ? 'primary' : 'default'}
                icon={<PhoneFilled />}
                onClick={toggleAudioBridge}
                style={{ 
                  backgroundColor: isAudioBridgeActive ? '#52c41a' : undefined,
                  borderColor: isAudioBridgeActive ? '#52c41a' : undefined
                }}
              />
            </Tooltip>
          )}

          <Tooltip title="Participants">
            <Badge count={participantCount} showZero size="small">
              <Button
                shape="circle"
                size="large"
                icon={<UserOutlined />}
                onClick={() => setShowParticipants(true)}
              />
            </Badge>
          </Tooltip>

          <Tooltip title="Leave channel">
            <Button
              shape="circle"
              size="large"
              danger
              icon={<PoweroffOutlined />}
              onClick={handleLeaveChannel}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Chat drawer temporarily hidden - not working */}
      {/* <Drawer
        title="Chat"
        placement="right"
        onClose={() => setShowChat(false)}
        open={showChat}
        width={400}
      >
        <ChatPanel userName={userName} />
      </Drawer> */}

      <Drawer
        title={`Participants (${participantCount})`}
        placement="right"
        onClose={() => setShowParticipants(false)}
        open={showParticipants}
        width={300}
      >
        <List
          dataSource={[{ uid: currentUid, name: userName, isLocal: true }, ...remoteUsers.map((u: any) => ({ uid: u.uid, name: `User ${u.uid}`, isLocal: false }))]}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space>
                    {item.name}
                    {item.isLocal && <Badge status="success" text="You" />}
                  </Space>
                }
                description={`UID: ${item.uid}`}
              />
            </List.Item>
          )}
        />
      </Drawer>

      {/* Dial Phone Modal */}
      <DialPhoneModal
        visible={showDialModal}
        onClose={() => setShowDialModal(false)}
        onDial={handleDialPhone}
        channelName={currentChannelId}
      />
    </div>
  );
};

export default VideoHost;
