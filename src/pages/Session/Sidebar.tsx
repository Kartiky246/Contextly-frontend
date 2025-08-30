import React from 'react';
import { FaFilePdf, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './Sidebar.css';

export interface SessionData {
  _id: string;
  name: string;
  userId: string;
  isReadyToUse: boolean;
  context: {
    pdfFiles: string[];
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface SidebarProps {
  data: SessionData[];
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ data, isOpen, toggleSidebar }) => {
  return (
    <aside className={`sidebar${isOpen ? ' open' : ' collapsed'}`}>  
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
      </button>
      {isOpen ? (
        <div className="sidebar-content">
          <h3 className="sidebar-title">Session List</h3>
          <ul className="session-list">
            {data.map((item, idx) => (
              <li key={idx} className="session-item">
                <div className="session-header">
                  <span className="session-name">{item.name}</span>
                  <span className={`session-status ${item.isReadyToUse ? 'ready' : 'not-ready'}`}>{item.isReadyToUse ? 'Ready' : 'Not Ready'}</span>
                </div>
                <div className="session-context">
                  <span className="context-date">
                    {new Date(item.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }).replace(/\//g, ',')}
                  </span>
                  <div className="pdf-list">
                    {item.context.pdfFiles.map((link, i) => (
                      <a href={link} target="_blank" rel="noopener noreferrer" key={i} className="pdf-link">
                        <FaFilePdf className="pdf-icon" />
                      </a>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
};

export default Sidebar;
