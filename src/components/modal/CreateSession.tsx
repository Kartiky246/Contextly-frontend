import React, { useState, useRef } from 'react';
import { FaFileUpload } from 'react-icons/fa';
import Modal from './Modal';
import './CreateSession.css';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (sessionData: FormData) => Promise<void>;
}

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ isOpen, onClose, onCreateSession }) => {
  console.log('CreateSessionModal props:', { isOpen });
  
  const [sessionName, setSessionName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      // Add the complete data structure
      formData.append('data', JSON.stringify({
        name: sessionName,
        isReadyToUse: false,
        context: {
          pdfFile: []
        }
      }));
      // Add files separately
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      await onCreateSession(formData);
      onClose();
      setSessionName('');
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Session">
      <form onSubmit={handleSubmit} className="create-session-form">
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="sessionName">Session Name</label>
            <input
              type="text"
              id="sessionName"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label>PDF Files</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="file-upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaFileUpload />
              <span>Choose PDF Files</span>
            </button>
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                <p>{selectedFiles.length} file(s) selected</p>
                <ul>
                  {selectedFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button 
            type="button" 
            className="modal-button secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="modal-button primary"
            disabled={!sessionName || selectedFiles.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateSessionModal;
