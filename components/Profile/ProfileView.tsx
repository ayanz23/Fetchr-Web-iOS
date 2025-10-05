import React, { useState, useEffect } from 'react';
import AuthService from '../../services/AuthService';
import PetService from '../../services/PetService';
import UserService from '../../services/UserService';
import { AppUser } from '../../types';
import { Pet } from '../../types/Pet';
import AddPetModal from './AddPetModal';
import './ProfileView.css';

interface ProfileViewProps {
  user: AppUser;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [showAddPet, setShowAddPet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);

  useEffect(() => {
    loadUserData();
    
    // Set user as online when visiting profile
    UserService.updateUserOnlineStatus(user.id, true);
    
    // Set user as offline when leaving (cleanup)
    return () => {
      UserService.updateUserOnlineStatus(user.id, false);
    };
  }, [user.id]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load or create user profile from Firebase
      const profile = await UserService.getOrCreateUserProfile(user);
      setUserProfile(profile);
      setUserTags(profile.tags || []);
      
      // Load pets
      await loadPets();
    } catch (error: any) {
      setError('Failed to load profile data');
      // Fallback to basic user data
      setUserProfile(user);
      setUserTags(user.tags || []);
    } finally {
      setLoading(false);
    }
  };

  const loadPets = async () => {
    try {
      const petsData = await PetService.getPets();
      setPets(petsData);
    } catch (error: any) {
      // Don't set error state for pets as it's not critical
    }
  };

  const handlePetAdded = (newPet: Pet) => {
    setPets(prev => [newPet, ...prev]);
  };

  const handleDeletePet = async (petId: string) => {
    if (window.confirm('Are you sure you want to delete this pet?')) {
      try {
        await PetService.deletePet(petId);
        setPets(prev => prev.filter(pet => pet.id !== petId));
      } catch (error: any) {
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
    }
  };

  const handleAddTag = async (tagToAdd?: string) => {
    const tag = tagToAdd || newTag;
    if (tag.trim() && !userTags.includes(tag.trim())) {
      const updatedTags = [...userTags, tag.trim()];
      setUserTags(updatedTags);
      setNewTag('');
      setShowTagInput(false);
      
      try {
        await UserService.updateUserTags(user.id, updatedTags);
        // Update local user profile state
        if (userProfile) {
          setUserProfile({ ...userProfile, tags: updatedTags });
        }
      } catch (error) {
        // Revert on error
        setUserTags(userTags);
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = userTags.filter(tag => tag !== tagToRemove);
    setUserTags(updatedTags);
    
    try {
      await UserService.updateUserTags(user.id, updatedTags);
      // Update local user profile state
      if (userProfile) {
        setUserProfile({ ...userProfile, tags: updatedTags });
      }
    } catch (error) {
      // Revert on error
      setUserTags(userTags);
    }
  };

  const predefinedTags = [
    'Looking for pet friends',
    'Looking for pet sitters',
    'Dog walking buddy',
    'Pet playdates',
    'Pet advice needed',
    'Experienced pet owner',
    'New pet owner',
    'Pet training help'
  ];


  const calculateAge = (birthdate: Date): string => {
    // Check if birthdate is valid
    if (!birthdate || isNaN(birthdate.getTime())) {
      return 'Unknown age';
    }
    
    const today = new Date();
    const ageInYears = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
      return `${ageInYears - 1} years old`;
    }
    
    if (ageInYears === 0) {
      const ageInMonths = monthDiff || 1;
      return `${ageInMonths} month${ageInMonths > 1 ? 's' : ''} old`;
    }
    
    return `${ageInYears} year${ageInYears > 1 ? 's' : ''} old`;
  };

  if (loading) {
    return (
      <div className="profile-view">
        <div className="profile-header">
          <h1>Profile</h1>
        </div>
        <div className="profile-content">
          <div className="loading-message">
            <div className="loading-spinner">🐾</div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-view">
      <div className="profile-header">
        <h1>Profile</h1>
      </div>
      
      <div className="profile-content">
        <div className="profile-section">
          <h2>My Pets</h2>
          {error && <div className="error-message">{error}</div>}
          
          <div className="pets-list">
            {pets.length === 0 && (
              <div className="no-pets-message">
                <div className="no-pets-icon">🐾</div>
                <p>No pets added yet</p>
                <small>Add your first pet to get started!</small>
              </div>
            )}
            
            {pets.map((pet) => (
              <div key={pet.id} className="pet-item">
                <div className="pet-icon">🐾</div>
                <div className="pet-info">
                  <div className="pet-name">{pet.name}</div>
                  <div className="pet-breed">{pet.breed}</div>
                  <div className="pet-age">{calculateAge(pet.birthdate)}</div>
                </div>
                <button 
                  className="delete-pet-button"
                  onClick={() => handleDeletePet(pet.id)}
                  title="Delete pet"
                >
                  🗑️
                </button>
              </div>
            ))}
            
            <button 
              className="add-pet-button"
              onClick={() => setShowAddPet(true)}
            >
              <span className="add-icon">➕</span>
              <span>Add New Pet</span>
            </button>
          </div>
        </div>


        <div className="profile-section">
          <h2>Profile Tags</h2>
          <p className="section-description">Add tags to help other pet owners find you</p>
          
          <div className="user-tags-container">
            {userTags.map((tag, index) => (
              <div key={index} className="user-tag">
                <span>{tag}</span>
                <button 
                  className="remove-tag-btn"
                  onClick={() => handleRemoveTag(tag)}
                  title="Remove tag"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {!showTagInput ? (
            <button 
              className="add-tag-button"
              onClick={() => setShowTagInput(true)}
            >
              <span className="add-icon">➕</span>
              <span>Add Tag</span>
            </button>
          ) : (
            <div className="tag-input-container">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Enter a tag..."
                className="tag-input"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <button 
                className="save-tag-btn"
                onClick={() => handleAddTag()}
                disabled={!newTag.trim()}
              >
                Add
              </button>
              <button 
                className="cancel-tag-btn"
                onClick={() => {
                  setShowTagInput(false);
                  setNewTag('');
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <div className="predefined-tags">
            <p className="predefined-tags-title">Quick add:</p>
            <div className="predefined-tags-list">
              {predefinedTags
                .filter(tag => !userTags.includes(tag))
                .map((tag, index) => (
                  <button
                    key={index}
                    className="predefined-tag"
                    onClick={() => handleAddTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h2>Account</h2>
          <div className="account-info">
            {userProfile && (
              <>
                <div className="account-item">
                  <span className="account-label">Name</span>
                  <span className="account-value">{userProfile.displayName}</span>
                </div>
                <div className="account-item">
                  <span className="account-label">Email</span>
                  <span className="account-value">{userProfile.email}</span>
                </div>
                {userProfile.bio && (
                  <div className="account-item">
                    <span className="account-label">Bio</span>
                    <span className="account-value">{userProfile.bio}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <button className="sign-out-button" onClick={handleSignOut}>
            <span className="sign-out-icon">🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </div>
      
      {showAddPet && (
        <AddPetModal
          isOpen={showAddPet}
          onClose={() => setShowAddPet(false)}
          onPetAdded={handlePetAdded}
        />
      )}
    </div>
  );
};

export default ProfileView;
