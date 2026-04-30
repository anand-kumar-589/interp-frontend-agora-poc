import React, { useState } from 'react';
import { Modal, Input, Button, Select, message, Space } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import './DialPhoneModal.css';

interface DialPhoneModalProps {
  visible: boolean;
  onClose: () => void;
  onDial: (phoneNumber: string) => Promise<void>;
  channelName: string;
}

const DialPhoneModal: React.FC<DialPhoneModalProps> = ({
  visible,
  onClose,
  onDial,
  channelName
}) => {
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDialing, setIsDialing] = useState(false);

  const handleDial = async () => {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.length < 10) {
      message.error('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    const fullNumber = countryCode + cleanNumber;
    
    setIsDialing(true);
    try {
      await onDial(fullNumber);
      message.success(`Dialing ${fullNumber}...`);
      onClose();
      setPhoneNumber('');
    } catch (error: any) {
      message.error(error.message || 'Failed to dial phone number');
    } finally {
      setIsDialing(false);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, spaces, dashes, and parentheses for formatting
    const value = e.target.value.replace(/[^\d\s\-()]/g, '');
    setPhoneNumber(value);
  };

  return (
    <Modal
      title={
        <Space>
          <PhoneOutlined style={{ color: '#52c41a' }} />
          <span>Dial Phone Number</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isDialing}>
          Cancel
        </Button>,
        <Button
          key="dial"
          type="primary"
          icon={<PhoneOutlined />}
          loading={isDialing}
          onClick={handleDial}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          {isDialing ? 'Dialing...' : 'Dial'}
        </Button>
      ]}
      className="dial-phone-modal"
    >
      <div className="dial-phone-content">
        <div className="channel-info">
          <strong>Channel:</strong> <span>{channelName}</span>
        </div>
        
        <div className="phone-input-container">
          <Select
            value={countryCode}
            onChange={setCountryCode}
            className="country-code-select"
            disabled={isDialing}
          >
            <Select.Option value="+1">🇺🇸 +1 (US/Canada)</Select.Option>
            <Select.Option value="+44">🇬🇧 +44 (UK)</Select.Option>
            <Select.Option value="+91">🇮🇳 +91 (India)</Select.Option>
            <Select.Option value="+86">🇨🇳 +86 (China)</Select.Option>
            <Select.Option value="+81">🇯🇵 +81 (Japan)</Select.Option>
            <Select.Option value="+49">🇩🇪 +49 (Germany)</Select.Option>
            <Select.Option value="+33">🇫🇷 +33 (France)</Select.Option>
            <Select.Option value="+39">🇮🇹 +39 (Italy)</Select.Option>
            <Select.Option value="+61">🇦🇺 +61 (Australia)</Select.Option>
            <Select.Option value="+52">🇲🇽 +52 (Mexico)</Select.Option>
            <Select.Option value="+55">🇧🇷 +55 (Brazil)</Select.Option>
            <Select.Option value="+34">🇪🇸 +34 (Spain)</Select.Option>
            <Select.Option value="+82">🇰🇷 +82 (South Korea)</Select.Option>
            <Select.Option value="+7">🇷🇺 +7 (Russia)</Select.Option>
          </Select>
          
          <Input
            placeholder="5551234567"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            onPressEnter={handleDial}
            maxLength={20}
            disabled={isDialing}
            className="phone-number-input"
            size="large"
          />
        </div>
        
        <div className="input-hint">
          <small>
            <strong>Format:</strong> Enter number without country code<br />
            <strong>Example:</strong> 5551234567 or (555) 123-4567
          </small>
        </div>

        <div className="dial-info">
          <p>
            <PhoneOutlined /> The phone user will receive a call and be connected to this channel automatically.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default DialPhoneModal;
