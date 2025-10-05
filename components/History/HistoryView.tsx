import React from 'react';
import './HistoryView.css';

const HistoryView: React.FC = () => {
  return (
    <div className="history-view">
      <div className="history-header">
        <h1>History</h1>
      </div>
      
      <div className="history-content">
        <div className="history-placeholder">
          <div className="history-icon">📊</div>
          <h2>History coming soon</h2>
          <p>Track your pet's activity patterns and health trends over time.</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
