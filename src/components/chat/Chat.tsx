import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { FaMicrophone } from 'react-icons/fa';
import { useAuth } from '@clerk/clerk-react';
import { BsThreeDots } from 'react-icons/bs';
import { apiUrl } from '../../config/api';

interface Message {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId?: string;
  userId?: string;
  __v?: number;
  timeStamp?: string;
}

interface ChatProps {
  sessionId: string;
}

interface ChatResponse {
  chat: Message[];
}

const Chat: React.FC<ChatProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');
  const completeResponseRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getToken } = useAuth();

  const scrollToBottom = () => {
    // Use requestAnimationFrame to ensure DOM is updated before scrolling
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  // Scroll to bottom on initial load and when messages change
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Scroll to bottom when messages or streaming response changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedResponse]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setStreamedResponse('');
    completeResponseRef.current = '';

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

  const response = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          message: inputMessage
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Split by newlines to handle multiple data chunks
        const lines = chunk.split('\n');
        
        lines.forEach(line => {
          // Check if line starts with "data: " and extract the content
          if (line.startsWith('data: ')) {
            const content = line.substring(6); // Remove "data: " prefix
            completeResponseRef.current += content + ' '; // Build complete response
            setStreamedResponse(completeResponseRef.current); // Update displayed response
          }
        });
      }

      // Once streaming is complete, add the full message to messages array
      const assistantMessage: Message = { role: 'assistant', content: completeResponseRef.current.trim() };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamedResponse('');
      setIsStreaming(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found');
        }

  const response = await fetch(apiUrl(`/api/chat/${sessionId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data: ChatResponse = await response.json();
        setMessages(data.chat || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    if (sessionId) {
      fetchMessages();
    }
  }, [sessionId, getToken]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="message assistant-message">
            <div className="message-content">
              {streamedResponse || (
                <div className="loading-dots">
                  <BsThreeDots />
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input 
            type="text" 
            className="chat-input" 
            placeholder="What's in your mind?"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <div className="chat-input-actions">
            <button className="chat-input-button voice">
              <FaMicrophone />
            </button>
            <button 
              className="chat-input-button send"
              onClick={handleSendMessage}
              disabled={isStreaming || !inputMessage.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
