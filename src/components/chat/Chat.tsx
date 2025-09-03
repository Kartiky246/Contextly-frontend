import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { useAuth } from '@clerk/clerk-react';
import { BsThreeDots } from 'react-icons/bs';
import { apiUrl } from '../../config/api';

interface Segment {
  type: 'text' | 'source' | 'link' | string;
  value: string;
}

interface Message {
  _id?: string;
  role: 'user' | 'assistant';
  // content can be plain string (legacy) or an array of typed segments
  content: string | Segment[];
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
  const [streamedResponse, setStreamedResponse] = useState<Segment[]>([]);
  const completeResponseRef = useRef<Segment[]>([]);
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
  setStreamedResponse([]);
  completeResponseRef.current = [];

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
        // Split by newlines to handle multiple JSON objects per chunk
        const lines = chunk.split('\n');

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;
          // If the stream uses SSE style with "data: " prefix, strip it
          const raw = trimmed.startsWith('data: ') ? trimmed.substring(6) : trimmed;

          try {
            const obj = JSON.parse(raw);
            let t: string = obj.type || 'text';
            const v: string = obj.value || '';

            // Handle common typo
            if (t === 'socure') t = 'source';

            // Merge consecutive text segments for nicer display
            const segs = completeResponseRef.current;
            if (t === 'text') {
              const last = segs[segs.length - 1];
              if (last && last.type === 'text') {
                last.value += v;
              } else {
                segs.push({ type: 'text', value: v });
              }
            } else if (t === 'source' || t === 'link') {
              segs.push({ type: t as 'source' | 'link', value: v });
            } else {
              // unknown types - treat as text
              const last = segs[segs.length - 1];
              if (last && last.type === 'text') {
                last.value += v;
              } else {
                segs.push({ type: 'text', value: v });
              }
            }

            // update visible streamed response
            setStreamedResponse([...completeResponseRef.current]);
          } catch (err) {
            // Not JSON, append raw text to last text segment
            const segs = completeResponseRef.current;
            if (segs.length === 0 || segs[segs.length - 1].type !== 'text') {
              segs.push({ type: 'text', value: raw });
            } else {
              segs[segs.length - 1].value += raw;
            }
            setStreamedResponse([...completeResponseRef.current]);
          }
        });
      }

      // Once streaming is complete, add the full message (as segments) to messages array
      const assistantMessage: Message = { role: 'assistant', content: completeResponseRef.current };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamedResponse([]);
      completeResponseRef.current = [];
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

        // Helper to parse inline tags like <linkStart>...</linkEnd> and <sourceStart>...</sourceStart>
        const parseInlineTags = (text: string): Segment[] => {
          const segs: Segment[] = [];
          let cursor = 0;
          const openTagRegex = /<\s*(linkStart|LinkStart|sourceStart|SourceStart)\s*>/g;

          while (cursor < text.length) {
            openTagRegex.lastIndex = cursor;
            const openMatch = openTagRegex.exec(text);
            if (!openMatch) {
              // no more tags
              const rem = text.slice(cursor);
              if (rem) segs.push({ type: 'text', value: rem });
              break;
            }

            const openIndex = openMatch.index;
            // push preceding text
            if (openIndex > cursor) {
              segs.push({ type: 'text', value: text.slice(cursor, openIndex) });
            }

            const tagName = openMatch[1];
            const lower = tagName.toLowerCase();
            // determine closing tag variants
            let closeRegex: RegExp;
            if (lower.startsWith('link')) {
              // accept </linkEnd> or </linkStart>
              closeRegex = /<\s*\/\s*(linkEnd|linkStart|LinkStart)\s*>/gi;
            } else {
              closeRegex = /<\s*\/\s*(sourceStart|SourceStart)\s*>/gi;
            }

            // search for close
            closeRegex.lastIndex = openTagRegex.lastIndex;
            const closeMatch = closeRegex.exec(text);
            let inner = '';
            if (closeMatch) {
              inner = text.slice(openTagRegex.lastIndex, closeMatch.index);
              cursor = closeRegex.lastIndex;
            } else {
              // no close found - take rest
              inner = text.slice(openTagRegex.lastIndex);
              cursor = text.length;
            }

            if (lower.startsWith('link')) {
              segs.push({ type: 'link', value: inner });
            } else {
              segs.push({ type: 'source', value: inner });
            }
          }

          return segs;
        };

        // Convert any plain-string content that contains inline tags into Segment[] so rendering matches streamed responses
        const normalized = (data.chat.sort((a,b)=>{
            if(a.timeStamp!==b.timeStamp){
              return new Date(a.timeStamp!).getTime() - new Date(b.timeStamp!).getTime()
            }
            return a.role.toLowerCase() === 'assistant' ? 1 : -1
        }) || []).map(msg => {
          if (msg && typeof msg.content === 'string' && msg.content.includes('<')) {
            try {
              const parsed = parseInlineTags(msg.content);
              // If parsing produced only a single text segment identical to original, keep string to avoid unnecessary change
              if (parsed.length === 1 && parsed[0].type === 'text' && parsed[0].value === msg.content) {
                return msg;
              }
              return { ...msg, content: parsed } as Message;
            } catch (e) {
              return msg;
            }
          }
          return msg;
        });

        setMessages(normalized);
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
              {/* Render content which may be legacy string or Segment[] */}
              {typeof message.content === 'string' ? (
                message.content
              ) : (
                (message.content as Segment[]).map((seg, i) => {
                  if (seg.type === 'source') {
                    return (
                      <span key={i} className="message-source">{seg.value}</span>
                    );
                  }

                  if (seg.type === 'link') {
                    return (
                      <a key={i} className="message-link" href={seg.value} target="_blank" rel="noopener noreferrer">{seg.value}</a>
                    );
                  }

                  // default text
                  return <span key={i}>{seg.value}</span>;
                })
              )}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="message assistant-message">
            <div className="message-content">
              {streamedResponse.length > 0 ? (
                streamedResponse.map((seg, i) => {
                  if (seg.type === 'source') {
                    return <span key={i} className="message-source">{seg.value}</span>;
                  }
                  if (seg.type === 'link') {
                    return <a key={i} className="message-link" href={seg.value} target="_blank" rel="noopener noreferrer">{seg.value}</a>;
                  }
                  return <span key={i}>{seg.value}</span>;
                })
              ) : (
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
