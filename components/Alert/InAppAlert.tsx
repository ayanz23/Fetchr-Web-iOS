import React, { useState, useEffect, useRef } from 'react';
import './InAppAlert.css';

export interface AlertData {
  id: string;
  type: 'voice' | 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  duration?: number; // Auto-dismiss duration in ms (0 = no auto-dismiss)
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

interface InAppAlertProps {
  alert: AlertData;
  onClose: (id: string) => void;
  onAction?: (id: string, actionLabel: string) => void;
}

const InAppAlert: React.FC<InAppAlertProps> = ({ alert, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Show alert with animation
    const showAlert = () => {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Auto-dismiss if duration is set
      if (alert.duration && alert.duration > 0) {
        timeoutRef.current = setTimeout(() => {
          handleClose();
        }, alert.duration);
      }
    };

    // Small delay to ensure smooth animation
    const showTimeout = setTimeout(showAlert, 50);
    
    return () => {
      clearTimeout(showTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [alert.duration]);

  const handleClose = () => {
    setIsAnimating(false);
    
    // Wait for animation to complete before hiding
    animationTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      onClose(alert.id);
    }, 300); // Match CSS animation duration
  };

  const handleAction = (actionLabel: string) => {
    if (onAction) {
      onAction(alert.id, actionLabel);
    }
    handleClose();
  };

  if (!isVisible) {
    return null;
  }

  const getAlertIcon = () => {
    switch (alert.type) {
      case 'voice':
        return '🔊';
      case 'danger':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getAlertClass = () => {
    const baseClass = 'in-app-alert';
    const typeClass = `in-app-alert--${alert.type}`;
    const priorityClass = `in-app-alert--${alert.priority}`;
    const animationClass = isAnimating ? 'in-app-alert--show' : 'in-app-alert--hide';
    
    return `${baseClass} ${typeClass} ${priorityClass} ${animationClass}`;
  };

  return (
    <div className={getAlertClass()}>
      <div className="in-app-alert__content">
        <div className="in-app-alert__header">
          <div className="in-app-alert__icon">
            {getAlertIcon()}
          </div>
          <div className="in-app-alert__title">
            {alert.title}
          </div>
          <button 
            className="in-app-alert__close"
            onClick={handleClose}
            aria-label="Close alert"
          >
            ×
          </button>
        </div>
        
        <div className="in-app-alert__message">
          {alert.message}
        </div>
        
        {alert.actions && alert.actions.length > 0 && (
          <div className="in-app-alert__actions">
            {alert.actions.map((action, index) => (
              <button
                key={index}
                className="in-app-alert__action"
                onClick={() => handleAction(action.label)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InAppAlert;
