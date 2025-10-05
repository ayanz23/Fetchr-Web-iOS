import React, { useState, useEffect } from 'react';
import DashboardView from '../Dashboard/DashboardView';
import ProfileView from '../Profile/ProfileView';
import CommunityFeed from '../Community/CommunityFeed';
import NearbyVetsView from '../Vets/NearbyVetsView';
import FriendsView from '../Friends/FriendsView';
import PetTranslator from '../PetTranslator/PetTranslator';
import { AppUser } from '../../types';
import './MainView.css';

type TabType = 'dashboard' | 'profile' | 'community' | 'vets' | 'friends' | 'pet-translator';

interface MainViewProps {
  user: AppUser;
}

const MainView: React.FC<MainViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running on iOS Capacitor
    const checkIOS = () => {
      if (typeof window !== 'undefined') {
        const isCapacitor = window.location.protocol === 'capacitor:';
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(isCapacitor && isIOSDevice);
      }
    };
    
    checkIOS();
  }, []);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'profile':
        return <ProfileView user={user} />;
      case 'community':
        return <CommunityFeed />;
      case 'vets':
        return <NearbyVetsView />;
      case 'friends':
        return <FriendsView user={user} />;
      case 'pet-translator':
        return <PetTranslator />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className={`main-view ${isIOS ? 'ios-layout' : ''}`}>
      {!isIOS && (
        <nav className="top-nav">
          <div className="nav-brand">
            <span className="brand-icon">🐾</span>
            <span className="brand-text">Fetchr</span>
          </div>
          
          <div className="nav-items">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="nav-icon">🐾</span>
              <span className="nav-label">Dashboard</span>
            </button>
            
            <button 
              className={`nav-item ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => setActiveTab('community')}
            >
              <span className="nav-icon">🗣️</span>
              <span className="nav-label">Community</span>
            </button>
            
            <button 
              className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-label">Friends</span>
            </button>
            
            <button 
              className={`nav-item ${activeTab === 'pet-translator' ? 'active' : ''}`}
              onClick={() => setActiveTab('pet-translator')}
            >
              <span className="nav-icon">🔍</span>
              <span className="nav-label">Pet Translator</span>
            </button>
            
            <button 
              className={`nav-item ${activeTab === 'vets' ? 'active' : ''}`}
              onClick={() => setActiveTab('vets')}
            >
              <span className="nav-icon">🏥</span>
              <span className="nav-label">Vets</span>
            </button>
            
            <button 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="nav-icon">👤</span>
              <span className="nav-label">Profile</span>
            </button>
            
          </div>
        </nav>
      )}
      
      <div className={`main-content ${isIOS ? 'ios-content' : ''}`}>
        {renderActiveTab()}
      </div>
      
      {isIOS && (
        <nav className="bottom-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">🐾</span>
            <span className="nav-label">Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            <span className="nav-icon">🗣️</span>
            <span className="nav-label">Community</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-label">Friends</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'pet-translator' ? 'active' : ''}`}
            onClick={() => setActiveTab('pet-translator')}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-label">Pet Translator</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'vets' ? 'active' : ''}`}
            onClick={() => setActiveTab('vets')}
          >
            <span className="nav-icon">🏥</span>
            <span className="nav-label">Vets</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </button>
          
        </nav>
      )}
    </div>
  );
};

export default MainView;
