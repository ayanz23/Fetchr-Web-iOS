import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AppUser } from '../../types/User';
import { FriendRequest, FriendshipWithProfile, FriendshipStats } from '../../types/Friendship';
import FriendshipService from '../../services/FriendshipService';
import { Unsubscribe } from 'firebase/firestore';
import './FriendsView.css';

interface FriendsViewProps {
  user: AppUser;
}

const FriendsView: React.FC<FriendsViewProps> = ({ user }) => {
  
  const [recommendedFriends, setRecommendedFriends] = useState<UserProfile[]>([]);
  const [userFriends, setUserFriends] = useState<FriendshipWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(FriendRequest & { fromUser: UserProfile })[]>([]);
  const [sentRequests, setSentRequests] = useState<(FriendRequest & { toUser: UserProfile })[]>([]);
  const [friendshipStats, setFriendshipStats] = useState<FriendshipStats>({
    friendsCount: 0,
    pendingRequestsCount: 0,
    sentRequestsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [actionLoading, setActionLoading] = useState<{
    [key: string]: boolean;
  }>({});
  
  // Refs to store unsubscribe functions
  const unsubscribeRefs = useRef<{
    friendships?: Unsubscribe;
    pendingRequests?: Unsubscribe;
    sentRequests?: Unsubscribe;
  }>({});

  // Load recommended friends (not real-time)
  const loadRecommendedFriends = useCallback(async () => {
    try {
      const recommended = await FriendshipService.getRecommendedFriends(user.id, 3);
      setRecommendedFriends(recommended);
    } catch (err) {
      console.error('Failed to load recommended friends:', err);
      setError('Failed to load recommended friends. Please try again.');
    }
  }, [user.id]);

  // Setup real-time listeners
  const setupRealtimeListeners = useCallback(() => {
    // Unsubscribe from existing listeners
    Object.values(unsubscribeRefs.current).forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });

    // Set up new listeners
    unsubscribeRefs.current.friendships = FriendshipService.subscribeToFriendships(
      user.id,
      (friendships) => {
        setUserFriends(friendships);
        setFriendshipStats(prev => ({ ...prev, friendsCount: friendships.length }));
      }
    );

    unsubscribeRefs.current.pendingRequests = FriendshipService.subscribeToFriendRequests(
      user.id,
      (requests) => {
        setPendingRequests(requests);
        setFriendshipStats(prev => ({ ...prev, pendingRequestsCount: requests.length }));
      }
    );

    unsubscribeRefs.current.sentRequests = FriendshipService.subscribeToSentFriendRequests(
      user.id,
      (requests) => {
        setSentRequests(requests);
        setFriendshipStats(prev => ({ ...prev, sentRequestsCount: requests.length }));
      }
    );
  }, [user.id]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize data and listeners
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load recommended friends
        await loadRecommendedFriends();
        
        // Setup real-time listeners
        setupRealtimeListeners();
        
        setLoading(false);
      } catch (err) {
        setError('Failed to initialize friends data');
        setLoading(false);
      }
    };

    if (user && user.id) {
      initializeData();
    } else {
      setLoading(false);
    }

    // Cleanup listeners on unmount
    return () => {
      Object.values(unsubscribeRefs.current).forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [loadRecommendedFriends, setupRealtimeListeners, user]);

  const handleSendFriendRequest = async (friendId: string) => {
    const actionKey = `send-${friendId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      setError(null);
      setSuccess(null);
      
      // Validate inputs
      if (!user.id) {
        throw new Error('User ID is not available');
      }
      if (!friendId) {
        throw new Error('Friend ID is not available');
      }
      if (user.id === friendId) {
        throw new Error('Cannot send friend request to yourself');
      }

      const requestId = await FriendshipService.sendFriendRequest(user.id, friendId);
      
      // Immediately update UI state
      setRecommendedFriends(prev => prev.filter(f => f.id !== friendId));
      
      const targetUser = recommendedFriends.find(f => f.id === friendId);
      if (targetUser) {
        const newSentRequest = {
          id: requestId,
          fromUserId: user.id,
          toUserId: friendId,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          toUser: targetUser
        };
        setSentRequests(prev => [newSentRequest, ...prev]);
        setFriendshipStats(prev => ({ ...prev, sentRequestsCount: prev.sentRequestsCount + 1 }));
      }
      
      await loadRecommendedFriends();
      setActiveTab('requests');
      
      if (targetUser) {
        setSuccess(`Friend request sent to ${targetUser.displayName}!`);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send friend request');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const requestToAccept = pendingRequests.find(r => r.id === requestId);
      if (!requestToAccept) {
        throw new Error('Friend request not found');
      }

      await FriendshipService.acceptFriendRequest(requestId);
      
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setFriendshipStats(prev => ({ ...prev, pendingRequestsCount: prev.pendingRequestsCount - 1 }));
      
      const newFriendship = {
        id: `friend-${Date.now()}`,
        friend: requestToAccept.fromUser,
        createdAt: new Date().toISOString()
      };
      setUserFriends(prev => [newFriendship, ...prev]);
      setFriendshipStats(prev => ({ ...prev, friendsCount: prev.friendsCount + 1 }));
      
      await loadRecommendedFriends();
      setActiveTab('friends');
      
    } catch (err) {
      setError('Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await FriendshipService.declineFriendRequest(requestId);
      
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setFriendshipStats(prev => ({ ...prev, pendingRequestsCount: prev.pendingRequestsCount - 1 }));
      
    } catch (err) {
      setError('Failed to decline friend request');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await FriendshipService.cancelFriendRequest(requestId);
      
      setSentRequests(prev => prev.filter(r => r.id !== requestId));
      setFriendshipStats(prev => ({ ...prev, sentRequestsCount: prev.sentRequestsCount - 1 }));
      
      await loadRecommendedFriends();
      
    } catch (err) {
      setError('Failed to cancel friend request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await FriendshipService.removeFriendship(user.id, friendId);
      
      setUserFriends(prev => prev.filter(f => f.friend.id !== friendId));
      setFriendshipStats(prev => ({ ...prev, friendsCount: prev.friendsCount - 1 }));
      
      await loadRecommendedFriends();
      
    } catch (err) {
      setError('Failed to remove friend');
    }
  };

  const handleBulkAcceptRequests = async (requestIds: string[]) => {
    try {
      await FriendshipService.bulkAcceptFriendRequests(requestIds);
      
      setPendingRequests(prev => prev.filter(r => !requestIds.includes(r.id)));
      
      const requestsToAccept = pendingRequests.filter(r => requestIds.includes(r.id));
      const newFriendships = requestsToAccept.map(request => ({
        id: `request-${Date.now()}-${request.id}`,
        friend: request.fromUser,
        createdAt: new Date().toISOString()
      }));
      
      setUserFriends(prev => [...newFriendships, ...prev]);
      setFriendshipStats(prev => ({ 
        ...prev, 
        pendingRequestsCount: prev.pendingRequestsCount - requestIds.length,
        friendsCount: prev.friendsCount + requestIds.length
      }));
      
      await loadRecommendedFriends();
      setActiveTab('friends');
      
    } catch (err) {
      setError('Failed to accept friend requests');
    }
  };

  const renderUserCard = (profile: UserProfile, isFriend: boolean = false) => (
    <div key={profile.id} className="user-card">
      <div className="user-avatar">
        {profile.photoURL ? (
          <img src={profile.photoURL} alt={profile.displayName} />
        ) : (
          <div className="default-avatar">👤</div>
        )}
      </div>
      
      <div className="user-info">
        <h3 className="user-name">{profile.displayName}</h3>
        {profile.bio && <p className="user-bio">{profile.bio}</p>}
        {profile.location && <p className="user-location">📍 {profile.location}</p>}
        
        {profile.tags && profile.tags.length > 0 && (
          <div className="user-tags">
            {profile.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      
      <div className="user-actions">
        {isFriend ? (
          <button 
            className="remove-friend-btn"
            onClick={() => handleRemoveFriend(profile.id)}
          >
            Remove Friend
          </button>
        ) : (
          <button 
            className="add-friend-btn"
            disabled={actionLoading[`send-${profile.id}`]}
            onClick={() => handleSendFriendRequest(profile.id)}
          >
            {actionLoading[`send-${profile.id}`] ? 'Sending...' : 'Send Request'}
          </button>
        )}
      </div>
    </div>
  );

  const renderFriendCard = (friendship: FriendshipWithProfile) => (
    <div key={friendship.id} className="user-card">
      <div className="user-avatar">
        {friendship.friend.photoURL ? (
          <img src={friendship.friend.photoURL} alt={friendship.friend.displayName} />
        ) : (
          <div className="default-avatar">👤</div>
        )}
      </div>
      
      <div className="user-info">
        <h3 className="user-name">{friendship.friend.displayName}</h3>
        {friendship.friend.bio && <p className="user-bio">{friendship.friend.bio}</p>}
        {friendship.friend.location && <p className="user-location">📍 {friendship.friend.location}</p>}
        
        {friendship.friend.tags && friendship.friend.tags.length > 0 && (
          <div className="user-tags">
            {friendship.friend.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      
      <div className="user-actions">
        <button 
          className="remove-friend-btn"
          onClick={() => handleRemoveFriend(friendship.friend.id)}
        >
          Remove Friend
        </button>
      </div>
    </div>
  );

  const renderFriendRequestCard = (request: FriendRequest & { fromUser: UserProfile }) => (
    <div key={request.id} className="user-card">
      <div className="user-avatar">
        {request.fromUser.photoURL ? (
          <img src={request.fromUser.photoURL} alt={request.fromUser.displayName} />
        ) : (
          <div className="default-avatar">👤</div>
        )}
      </div>
      
      <div className="user-info">
        <h3 className="user-name">{request.fromUser.displayName}</h3>
        {request.fromUser.bio && <p className="user-bio">{request.fromUser.bio}</p>}
        {request.fromUser.location && <p className="user-location">📍 {request.fromUser.location}</p>}
        
        {request.fromUser.tags && request.fromUser.tags.length > 0 && (
          <div className="user-tags">
            {request.fromUser.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      
      <div className="user-actions">
        <button 
          className="accept-request-btn"
          onClick={() => handleAcceptRequest(request.id)}
        >
          Accept
        </button>
        <button 
          className="decline-request-btn"
          onClick={() => handleDeclineRequest(request.id)}
        >
          Decline
        </button>
      </div>
    </div>
  );

  const renderSentRequestCard = (request: FriendRequest & { toUser: UserProfile }) => (
    <div key={request.id} className="user-card">
      <div className="user-avatar">
        {request.toUser.photoURL ? (
          <img src={request.toUser.photoURL} alt={request.toUser.displayName} />
        ) : (
          <div className="default-avatar">👤</div>
        )}
      </div>
      
      <div className="user-info">
        <h3 className="user-name">{request.toUser.displayName}</h3>
        {request.toUser.bio && <p className="user-bio">{request.toUser.bio}</p>}
        {request.toUser.location && <p className="user-location">📍 {request.toUser.location}</p>}
        
        {request.toUser.tags && request.toUser.tags.length > 0 && (
          <div className="user-tags">
            {request.toUser.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}
        
        <div className="request-time">
          Sent {new Date(request.createdAt).toLocaleDateString()}
        </div>
      </div>
      
      <div className="user-actions">
        <button 
          className="cancel-request-btn"
          onClick={() => handleCancelRequest(request.id)}
        >
          Cancel Request
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="friends-view">
        <div className="loading">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="friends-view">
      <div className="friends-header">
        <h1>Friends</h1>
        <p>Connect with other pet owners in your community</p>
        
        {/* Connection Status */}
        <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button onClick={() => setSuccess(null)} className="close-success">×</button>
        </div>
      )}


      {/* Tab Navigation */}
      <div className="friends-tabs">
        <button 
          className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends ({friendshipStats.friendsCount})
        </button>
        <button 
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({friendshipStats.pendingRequestsCount})
          {friendshipStats.pendingRequestsCount > 0 && (
            <span className="notification-badge">{friendshipStats.pendingRequestsCount}</span>
          )}
        </button>
      </div>

      <div className="friends-sections">
        {activeTab === 'friends' ? (
          <>
            {/* Recommended Friends */}
            <section className="friends-section">
              <h2>Recommended Friends</h2>
              {recommendedFriends.length > 0 ? (
                <div className="friends-grid">
                  {recommendedFriends.map(profile => renderUserCard(profile, false))}
                </div>
              ) : (
                <div className="no-friends">
                  <p>No recommended friends at the moment.</p>
                  <button 
                    className="refresh-btn"
                    onClick={loadRecommendedFriends}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Refresh Recommendations'}
                  </button>
                </div>
              )}
            </section>

            {/* My Friends */}
            <section className="friends-section">
              <h2>My Friends ({userFriends.length})</h2>
              {userFriends.length > 0 ? (
                <div className="friends-grid">
                  {userFriends.map(friendship => renderFriendCard(friendship))}
                </div>
              ) : (
                <p className="no-friends">You haven't added any friends yet.</p>
              )}
            </section>
          </>
        ) : (
          <>
            {/* Pending Friend Requests */}
            <section className="friends-section">
              <div className="section-header">
                <h2>Friend Requests ({pendingRequests.length})</h2>
                {pendingRequests.length > 1 && (
                  <button 
                    className="bulk-accept-btn"
                    onClick={() => handleBulkAcceptRequests(pendingRequests.map(r => r.id))}
                  >
                    Accept All
                  </button>
                )}
              </div>
              {pendingRequests.length > 0 ? (
                <div className="friends-grid">
                  {pendingRequests.map(request => renderFriendRequestCard(request))}
                </div>
              ) : (
                <p className="no-friends">No pending friend requests.</p>
              )}
            </section>

            {/* Sent Friend Requests */}
            <section className="friends-section">
              <h2>Sent Requests ({sentRequests.length})</h2>
              {sentRequests.length > 0 ? (
                <div className="friends-grid">
                  {sentRequests.map(request => renderSentRequestCard(request))}
                </div>
              ) : (
                <p className="no-friends">No sent friend requests.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsView;
