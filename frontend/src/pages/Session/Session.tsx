import React, { useState, useEffect } from 'react';
import { TbLayoutSidebarRightExpand, TbLayoutSidebarLeftExpand } from 'react-icons/tb';
import { FaFilePdf, FaPlus } from 'react-icons/fa';
import './Session.css';
import Header from '../../components/header/Header';
import type { SessionData } from './Sidebar';
import CreateSessionModal from '../../components/modal/CreateSession';
import Chat from '../../components/chat/Chat';
import { useAuth } from '@clerk/clerk-react';

const Session: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { getToken } = useAuth();

  // Close sidebar when there are no sessions
  useEffect(() => {
    if (sessions.length === 0 && !loading) {
      setSidebarOpen(false);
    }
  }, [sessions.length, loading]);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchSessions = async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('http://localhost:3000/api/session/all', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }

        const data = await response.json();
        if (isMounted) {
          setSessions(data.session);
          setLoading(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching sessions:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSessions();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const handleCreateSession = async (formData: FormData) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // FormData already contains the properly structured data and files
      const response = await fetch('http://localhost:3000/api/session/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const newSession = await response.json();
      setSessions(prevSessions => [newSession, ...prevSessions]); // Add new session at the top
      setSidebarOpen(true); // Automatically open the sidebar
      setSelectedSessionId(newSession._id); // Select the newly created session
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  // Reset modal state
  React.useEffect(() => {
    setIsCreateModalOpen(false);
  }, []);

  return (
    <>
      <Header onNewSession={() => setIsCreateModalOpen(true)} />
      <CreateSessionModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSession={handleCreateSession}
      />
      <div className="session-container">
        <div className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
          <button 
            onClick={sessions.length > 0 ? toggleSidebar : undefined} 
            className={`sidebar-toggle ${sessions.length === 0 ? 'disabled' : ''}`}
            title={sessions.length === 0 ? "No documents available" : (sidebarOpen ? "Hide Documents" : "Show Documents")}
          >
            {sidebarOpen ? (
              <TbLayoutSidebarLeftExpand size={24} />
            ) : (
              <div className="doc-icon-wrapper">
                <TbLayoutSidebarRightExpand size={24} />
                {sessions.length > 0 && (
                  <span className="doc-count">{sessions.length}</span>
                )}
              </div>
            )}
          </button>
          {sidebarOpen && sessions.length > 0 && !loading && (
            <div className="sidebar-content">
              <ul className="session-list">
                {sessions.map((session, idx) => (
                  <li 
                    key={idx} 
                    className={`session-item ${selectedSessionId === session._id ? 'selected' : ''}`}
                    onClick={() => setSelectedSessionId(session._id)}
                  >
                    <div className="session-header">
                      <span className="session-name">{session.name}</span>
                      <span className={`session-status ${session.isReadyToUse ? 'ready' : 'not-ready'}`}>
                        {session.isReadyToUse ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                    <div className="session-context">
                      <span className="context-date">
                        {new Date(session.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }).replace(/\//g, ',')}
                      </span>
                      <div className="pdf-list">
                        {session.context.pdfFiles.map((pdf, i) => (
                          <a 
                            href={pdf} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            key={i} 
                            className="pdf-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FaFilePdf />
                          </a>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="session-main">
          <div className="main-content">

            {sessions.length === 0 ? (
              <div className="zero-state">
                <h1 className="zero-state-title">Welcome to Contextly</h1>
                <p className="zero-state-description">Create a session and upload context to start chatting</p>
                <button 
                  type="button"
                  className="zero-state-button"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <FaPlus size={16} />
                  <span>Create New Session</span>
                </button>
              </div>
            ) : !selectedSessionId ? (
              <div className="session-select-prompt">
                <p>Select a session to start chatting</p>
              </div>
            ) : (
              <div className="session-content-area">
                <Chat sessionId={selectedSessionId} />
              </div>
            )}
          </div>
        </div>
      </div>
      <CreateSessionModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSession={handleCreateSession}
      />
    </>
  );
};

export default Session;

