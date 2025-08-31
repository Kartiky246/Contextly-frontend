import React from 'react';
import { SignOutButton, useUser } from '@clerk/clerk-react';
import './Header.css';

import { FaPlus, FaUserCircle, FaLock } from 'react-icons/fa';

interface HeaderProps {
  onNewSession?: () => void;
  showNewSession?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNewSession, showNewSession = true }) => {
  const { user } = useUser();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="brand-name">Contextly</h1>
        </div>
        
        <div className="header-right">
          <div className={showNewSession ? 'user-section border-right' : 'user-section'}>
            <div className="user-avatar" title={user?.firstName || user?.emailAddresses[0].emailAddress || ''}>
              <FaUserCircle size={20} />
            </div>
            <SignOutButton>
              <button className="logout-button" title="Logout">
                <FaLock size={16} />
              </button>
            </SignOutButton>
          </div>
          {showNewSession && (
            <button className="new-session-button" onClick={onNewSession}>
              <FaPlus size={14} />
              <span>New Session</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;