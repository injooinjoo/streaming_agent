import { createContext, useContext, useState, useEffect } from 'react';

const StreamingModeContext = createContext(null);

export const StreamingModeProvider = ({ children }) => {
  const [isStreamingMode, setIsStreamingMode] = useState(() => {
    return localStorage.getItem('streamingMode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('streamingMode', isStreamingMode);
    document.documentElement.setAttribute('data-streaming-mode', isStreamingMode);
  }, [isStreamingMode]);

  const toggleStreamingMode = () => setIsStreamingMode(prev => !prev);

  return (
    <StreamingModeContext.Provider value={{ isStreamingMode, toggleStreamingMode }}>
      {children}
    </StreamingModeContext.Provider>
  );
};

export const useStreamingMode = () => {
  const context = useContext(StreamingModeContext);
  if (!context) {
    throw new Error('useStreamingMode must be used within StreamingModeProvider');
  }
  return context;
};

export default StreamingModeContext;
