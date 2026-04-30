import { useState } from 'react';
import { Button, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import { PhoneOutlined, VideoCameraOutlined, DownOutlined } from '@ant-design/icons';
import type { CallType } from '../../config/agora.config';
import './CallTypeSelector.css';

interface CallTypeSelectorProps {
  value: CallType;
  onChange: (callType: CallType) => void;
  disabled?: boolean;
}

export default function CallTypeSelector({ value, onChange, disabled }: CallTypeSelectorProps) {
  const [open, setOpen] = useState(false);

  const items: MenuProps['items'] = [
    {
      key: 'VRI',
      label: (
        <div className="call-type-menu-item">
          <VideoCameraOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
          <div className="call-type-text">
            <div className="call-type-label">VRI (Video Call)</div>
            <div className="call-type-description">Full video and audio communication</div>
          </div>
        </div>
      ),
      onClick: () => {
        onChange('VRI');
        setOpen(false);
      },
    },
    {
      key: 'OPI',
      label: (
        <div className="call-type-menu-item">
          <PhoneOutlined style={{ fontSize: '18px', color: '#52c41a' }} />
          <div className="call-type-text">
            <div className="call-type-label">OPI (Audio Call)</div>
            <div className="call-type-description">Audio-only communication (lightweight)</div>
          </div>
        </div>
      ),
      onClick: () => {
        onChange('OPI');
        setOpen(false);
      },
    },
  ];

  const getIcon = () => {
    return value === 'VRI' ? (
      <VideoCameraOutlined style={{ fontSize: '16px' }} />
    ) : (
      <PhoneOutlined style={{ fontSize: '16px' }} />
    );
  };

  const getLabel = () => {
    return value === 'VRI' ? 'VRI (Video Call)' : 'OPI (Audio Call)';
  };

  return (
    <div className="call-type-selector">
      <Dropdown 
        menu={{ items }} 
        trigger={['click']} 
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
      >
        <Button size="large" style={{ minWidth: '200px' }} disabled={disabled}>
          <Space>
            {getIcon()}
            {getLabel()}
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown>
    </div>
  );
}
