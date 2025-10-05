import React from 'react';
import { Vet } from '../../types';
import './NearbyVetsView.css';

// Hardcoded vet data from the user's request
const nearbyVets: Vet[] = [
  {
    id: 'vet_1',
    name: 'East Brunswick Animal Hospital',
    address: '44 Arthur St, East Brunswick, NJ 08816',
    phone: '+1 732-254-1212',
    email: 'privacy@nva.com'
  },
  {
    id: 'vet_2',
    name: 'Faith Veterinary Clinic',
    address: '2202 Route 130 North, Church Lane Plaza, US-130, North Brunswick Township, NJ 08902',
    phone: '+1 732-658-6777',
    email: 'info@faithurgentvet.com'
  },
  {
    id: 'vet_3',
    name: 'Easton Animal Clinic',
    address: '802 Easton Ave, Somerset, NJ 08873',
    phone: '+1 732-246-2680',
    email: 'eastonanimalclinic@gmail.com'
  },
  {
    id: 'vet_4',
    name: 'South Brunswick Animal Hospital',
    address: '879 Georges Rd, Monmouth Junction, NJ 08852',
    phone: '+1 732-821-0040',
    email: 'sbanimalhospital@gmail.com'
  },
  {
    id: 'vet_5',
    name: 'Cedar Lane Animal Clinic',
    address: '1760 Easton Ave #6, Somerset, NJ 08873',
    phone: '+1 732-469-5133',
    email: 'cedarlanegang@aol.com'
  }
];

const NearbyVetsView: React.FC = () => {
  const handleCallVet = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmailVet = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const handleDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
  };

  return (
    <div className="nearby-vets-view">
      <div className="vets-header">
        <h1>Nearby Vets</h1>
        <p className="vets-subtitle">Veterinary offices and animal hospitals near New Brunswick, NJ</p>
      </div>
      
      <div className="vets-content">
        <div className="vets-list">
          {nearbyVets.map((vet) => (
            <div key={vet.id} className="vet-card">
              <div className="vet-header">
                <div className="vet-icon">🏥</div>
                <div className="vet-info">
                  <h3 className="vet-name">{vet.name}</h3>
                  <p className="vet-address">{vet.address}</p>
                </div>
              </div>
              
              <div className="vet-details">
                <div className="vet-contact">
                  <div className="contact-item">
                    <span className="contact-icon">📞</span>
                    <span className="contact-label">Phone:</span>
                    <span className="contact-value">{vet.phone}</span>
                  </div>
                  <div className="contact-item">
                    <span className="contact-icon">✉️</span>
                    <span className="contact-label">Email:</span>
                    <span className="contact-value">{vet.email}</span>
                  </div>
                </div>
              </div>
              
              <div className="vet-actions">
                <button 
                  className="action-button call-button"
                  onClick={() => handleCallVet(vet.phone)}
                >
                  <span className="action-icon">📞</span>
                  <span>Call</span>
                </button>
                
                <button 
                  className="action-button email-button"
                  onClick={() => handleEmailVet(vet.email)}
                >
                  <span className="action-icon">✉️</span>
                  <span>Email</span>
                </button>
                
                <button 
                  className="action-button directions-button"
                  onClick={() => handleDirections(vet.address)}
                >
                  <span className="action-icon">📍</span>
                  <span>Directions</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NearbyVetsView;
