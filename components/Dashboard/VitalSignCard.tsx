import React from 'react';
import './VitalSignCard.css';

interface VitalSignCardProps {
  icon: string;
  iconColor: string;
  title: string;
  value: string;
  status: string;
  statusColor: string;
}

const VitalSignCard: React.FC<VitalSignCardProps> = ({
  icon,
  iconColor,
  title,
  value,
  status,
  statusColor
}) => {
  return (
    <div className="vital-sign-card">
      <div className="vital-icon" style={{ color: iconColor }}>
        <span>{icon}</span>
      </div>
      
      <div className="vital-content">
        <div className="vital-title">{title}</div>
        <div className="vital-value">{value}</div>
        <div className="vital-status" style={{ color: statusColor }}>
          {status}
        </div>
      </div>
    </div>
  );
};

export default VitalSignCard;
