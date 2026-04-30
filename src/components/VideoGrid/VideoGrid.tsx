import { useEffect, useRef } from 'react';
import { Card, Typography, Badge, Button, Space } from 'antd';
import { UserOutlined, VideoCameraOutlined, PhoneOutlined, PhoneFilled } from '@ant-design/icons';
import type { CallType } from '../../config/agora.config';
import type { PhoneParticipant } from '../../services/phoneService';
import './VideoGrid.css';

const { Text } = Typography;

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLDivElement>;
  remoteUsers: any[];
  isLocalVideoOn: boolean;
  localUserName: string;
  callType: CallType; // VRI or OPI
  phoneParticipants?: PhoneParticipant[]; // Phone participants
  onHangupPhone?: (callSid: string) => void; // Hangup phone callback
}

const VideoGrid: React.FC<VideoGridProps> = ({
  localVideoRef,
  remoteUsers,
  isLocalVideoOn,
  localUserName,
  callType,
  phoneParticipants = [],
  onHangupPhone,
}) => {
  const isOPI = callType === 'OPI';
  const remoteVideoRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    remoteUsers.forEach((user) => {
      // Play video track in DOM element
      const element = remoteVideoRefs.current.get(user.uid);
      if (element && user.videoTrack) {
        user.videoTrack.play(element);
      }
      
      // Play audio track (audio plays without DOM element)
      if (user.audioTrack) {
        user.audioTrack.play();
        console.log('🔊 Playing audio for user:', user.uid);
      }
    });
  }, [remoteUsers]);

  // Determine grid class based on total participants (remote users + phone)
  const totalRemoteParticipants = remoteUsers.length + phoneParticipants.length;
  const hasAnyRemoteParticipants = totalRemoteParticipants > 0;
  
  // Treat phone participants like regular remote users for grid layout
  const gridClass = !hasAnyRemoteParticipants ? 'video-grid-single' : 
                    totalRemoteParticipants === 1 ? 'video-grid-two' :
                    totalRemoteParticipants <= 4 ? 'video-grid-four' : 'video-grid-many';

  return (
    <div className={`video-grid ${gridClass}`}>
      {/* When alone: local video in grid. When others present: local video as PiP outside grid */}
      {!hasAnyRemoteParticipants ? (
        <div className="video-item">
          <Card className="video-card">
            {/* OPI Mode: Show phone icon with colored background */}
            {isOPI ? (
              <div className="audio-only-placeholder">
                <PhoneOutlined className="audio-only-icon" />
              </div>
            ) : (
              // VRI Mode: Show video or user icon
              <>
                <div
                  ref={localVideoRef}
                  className="video-player"
                  style={{ display: isLocalVideoOn ? 'block' : 'none' }}
                />
                {!isLocalVideoOn && (
                  <div className="video-placeholder">
                    <UserOutlined style={{ fontSize: 64, color: '#999' }} />
                  </div>
                )}
              </>
            )}
            <div className="video-info">
              <Badge status="success" />
              <Text strong style={{ color: '#fff' }}>
                {localUserName} (You)
              </Text>
            </div>
          </Card>
        </div>
      ) : (
        /* PiP: Local video overlay when others are present */
        <div className="local-video-pip">
          <Card className="video-card">
            {/* OPI Mode: Show phone icon */}
            {isOPI ? (
              <div className="audio-only-placeholder">
                <PhoneOutlined className="audio-only-icon-small" />
              </div>
            ) : (
              // VRI Mode: Show video or user icon
              <>
                <div
                  ref={localVideoRef}
                  className="video-player"
                  style={{ display: isLocalVideoOn ? 'block' : 'none' }}
                />
                {!isLocalVideoOn && (
                  <div className="video-placeholder">
                    <UserOutlined style={{ fontSize: 32, color: '#999' }} />
                  </div>
                )}
              </>
            )}
            <div className="video-info">
              <Badge status="success" />
              <Text strong style={{ color: '#fff' }}>
                You
              </Text>
            </div>
          </Card>
        </div>
      )}

      {/* Remote users: take main grid space */}
      {remoteUsers.map((user) => (
        <div key={user.uid} className="video-item remote-video-item">
          <Card className="video-card">
            {/* OPI Mode: Show phone icon for remote users */}
            {isOPI ? (
              <div className="audio-only-placeholder">
                <PhoneOutlined className="audio-only-icon" />
              </div>
            ) : (
              // VRI Mode: Show video or user icon
              <>
                <div
                  ref={(el) => {
                    if (el) {
                      remoteVideoRefs.current.set(user.uid, el);
                    }
                  }}
                  className="video-player"
                  style={{ display: user.hasVideo ? 'block' : 'none' }}
                />
                {!user.hasVideo && (
                  <div className="video-placeholder">
                    <UserOutlined style={{ fontSize: 64, color: '#999' }} />
                  </div>
                )}
              </>
            )}
            <div className="video-info">
              <Badge status={user.hasAudio ? 'success' : 'default'} />
              <Text strong style={{ color: '#fff' }}>
                User {user.uid}
              </Text>
              {isOPI && (
                <PhoneOutlined style={{ marginLeft: 8, color: '#52c41a' }} />
              )}
              {!isOPI && !user.hasVideo && (
                <VideoCameraOutlined style={{ marginLeft: 8, color: '#999' }} />
              )}
            </div>
          </Card>
        </div>
      ))}

      {/* Phone Participants */}
      {phoneParticipants.map((phone) => (
        <div key={phone.callSid} className="video-item phone-participant">
          <Card className="video-card phone-participant-card">
            <div className="audio-only-placeholder">
              {phone.status === 'ringing' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <PhoneFilled style={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.7)' }} />
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                    Connecting...
                  </Text>
                </div>
              ) : (
                <PhoneFilled style={{ fontSize: 80, color: 'rgba(255, 255, 255, 0.9)' }} />
              )}
            </div>
            <div className="video-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <Space>
                <Badge status={phone.status === 'connected' ? 'success' : 'processing'} />
                <Text strong style={{ color: '#fff' }}>
                  {phone.phoneNumber}
                </Text>
              </Space>
              <Text style={{ color: '#fff', fontSize: 12 }}>
                {phone.status === 'ringing' ? 'Ringing...' : 'Connected'}
              </Text>
              {onHangupPhone && phone.status === 'connected' && (
                <Button
                  size="small"
                  danger
                  icon={<PhoneOutlined />}
                  onClick={() => onHangupPhone(phone.callSid)}
                  style={{ marginTop: 8 }}
                >
                  Hang Up
                </Button>
              )}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default VideoGrid;
