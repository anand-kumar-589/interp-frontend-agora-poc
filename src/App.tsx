import { useEffect, useState } from 'react';
import { ConfigProvider, theme, App as AntApp, Alert } from 'antd';
import VideoHost from './components/VideoHost/VideoHost';
import { AGORA_CONFIG, validateAgoraConfig } from './config/agora.config';
import './App.css';

function App() {
  const [isConfigValid, setIsConfigValid] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(AGORA_CONFIG.ui.theme === 'dark');

  useEffect(() => {
    const isValid = validateAgoraConfig();
    setIsConfigValid(isValid);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#FF6B00',
          borderRadius: 8,
        },
      }}
    >
      <AntApp>
        <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
          {!isConfigValid ? (
            <div className="config-error">
              <Alert
                message="⚠️ Configuration Required"
                description={
                  <div>
                    <p>Please update your Agora App ID in:</p>
                    <code>src/config/agora.config.ts</code>
                    <br /><br />
                    <strong>Get FREE App ID (2 minutes):</strong>
                    <ol>
                      <li>Visit: <a href="https://console.agora.io/" target="_blank" rel="noopener noreferrer">console.agora.io</a></li>
                      <li>Sign up (FREE - no credit card!)</li>
                      <li>Create project: "Video Call POC"</li>
                      <li>Copy your App ID</li>
                      <li>Paste it in agora.config.ts</li>
                      <li>Reload this page</li>
                    </ol>
                    <br />
                    <strong>📖 See AGORA-CREDENTIALS-GUIDE.md for detailed instructions</strong>
                  </div>
                }
                type="error"
                showIcon
                style={{ maxWidth: 800, margin: '100px auto' }}
              />
            </div>
          ) : (
            <VideoHost isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
          )}
        </div>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
