import { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Typography, Space, Empty } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { chatService } from '../../services/chatService';
import type { AgoraChatMessage } from '../../types/agora.types';
import './ChatPanel.css';

const { Text } = Typography;
const { TextArea } = Input;

interface ChatPanelProps {
  userName: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ userName }) => {
  const [messages, setMessages] = useState<AgoraChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMessage = (message: AgoraChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    chatService.on('message', handleMessage);
    setMessages(chatService.getMessages());

    return () => {
      chatService.off('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    try {
      chatService.sendMessage(inputMessage.trim());
      setInputMessage('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-panel">
      <div className="messages-container">
        {messages.length === 0 ? (
          <Empty
            description="No messages yet"
            style={{ marginTop: 100 }}
          />
        ) : (
          <List
            dataSource={messages}
            renderItem={(message) => {
              const isOwnMessage = message.sender.name === userName;
              return (
                <div
                  key={message.id}
                  className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'}`}
                >
                  <div className="message-header">
                    <Space size={4}>
                      <UserOutlined style={{ fontSize: 12 }} />
                      <Text strong style={{ fontSize: 12 }}>
                        {isOwnMessage ? 'You' : message.sender.name}
                      </Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                  <div className="message-content">
                    <Text>{message.message}</Text>
                  </div>
                </div>
              );
            }}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message... (Enter to send)"
            autoSize={{ minRows: 1, maxRows: 4 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
          >
            Send
          </Button>
        </Space.Compact>
      </div>
    </div>
  );
};

export default ChatPanel;
