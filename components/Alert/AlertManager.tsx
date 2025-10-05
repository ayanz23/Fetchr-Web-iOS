import React, { useState, useCallback, useEffect } from 'react';
import InAppAlert, { AlertData } from './InAppAlert';

interface AlertManagerProps {
  children: React.ReactNode;
}

interface AlertManagerContextType {
  showAlert: (alert: Omit<AlertData, 'id'>) => string;
  hideAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

export const AlertManagerContext = React.createContext<AlertManagerContextType | null>(null);

const AlertManager: React.FC<AlertManagerProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const generateId = useCallback(() => {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showAlert = useCallback((alertData: Omit<AlertData, 'id'>): string => {
    const id = generateId();
    const newAlert: AlertData = {
      ...alertData,
      id,
      duration: alertData.duration ?? (alertData.priority === 'high' ? 8000 : 5000) // Default durations
    };

    setAlerts(prev => {
      // Remove any existing alerts of the same type to prevent spam
      const filtered = prev.filter(alert => 
        !(alert.type === newAlert.type && alert.message === newAlert.message)
      );
      return [...filtered, newAlert];
    });

    return id;
  }, [generateId]);

  const hideAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const handleAlertAction = useCallback((id: string, actionLabel: string) => {
    // This can be extended to handle specific actions
    // Action handling can be implemented here for specific alert types
  }, []);

  // Auto-cleanup old alerts to prevent memory leaks
  useEffect(() => {
    const cleanup = setInterval(() => {
      setAlerts(prev => {
        const now = Date.now();
        return prev.filter(alert => {
          // Remove alerts older than 30 seconds
          const alertTime = parseInt(alert.id.split('_')[1]);
          return now - alertTime < 30000;
        });
      });
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  const contextValue: AlertManagerContextType = {
    showAlert,
    hideAlert,
    clearAllAlerts
  };

  return (
    <AlertManagerContext.Provider value={contextValue}>
      {children}
      
      {/* Render alerts in reverse order so newest appears on top */}
      {alerts.slice().reverse().map((alert) => (
        <InAppAlert
          key={alert.id}
          alert={alert}
          onClose={hideAlert}
          onAction={handleAlertAction}
        />
      ))}
    </AlertManagerContext.Provider>
  );
};

export default AlertManager;
