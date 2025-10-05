import React, { useState } from 'react';
import PetService from '../../services/PetService';
import { Pet } from '../../types/Pet';
import './AddPetModal.css';

interface AddPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPetAdded: (pet: Pet) => void;
}

const AddPetModal: React.FC<AddPetModalProps> = ({ isOpen, onClose, onPetAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    birthdate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.name.trim() || !formData.breed.trim() || !formData.birthdate) {
        setError('Please fill in all fields.');
        return;
      }

      const petData: Omit<Pet, 'id'> = {
        name: formData.name.trim(),
        breed: formData.breed.trim(),
        birthdate: new Date(formData.birthdate)
      };

      const newPet = await PetService.addPet(petData);
      onPetAdded(newPet);
      
      // Reset form
      setFormData({
        name: '',
        breed: '',
        birthdate: ''
      });
      
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to add pet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        breed: '',
        birthdate: ''
      });
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Pet</h2>
          <button className="close-button" onClick={handleClose} disabled={isSubmitting}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pet-form">
          <div className="form-group">
            <label htmlFor="name">Pet Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter pet's name"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="breed">Breed *</label>
            <select
              id="breed"
              value={formData.breed}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              required
              disabled={isSubmitting}
              className="breed-select"
            >
              <option value="">Select a breed</option>
              <option value="Labrador Retriever">Labrador Retriever</option>
              <option value="Golden Retriever">Golden Retriever</option>
              <option value="German Shepherd">German Shepherd</option>
              <option value="French Bulldog">French Bulldog</option>
              <option value="Bulldog">Bulldog</option>
              <option value="Poodle">Poodle</option>
              <option value="Beagle">Beagle</option>
              <option value="Rottweiler">Rottweiler</option>
              <option value="German Shorthaired Pointer">German Shorthaired Pointer</option>
              <option value="Siberian Husky">Siberian Husky</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="birthdate">Birth Date *</label>
            <input
              type="date"
              id="birthdate"
              value={formData.birthdate}
              onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
              required
              disabled={isSubmitting}
              max={new Date().toISOString().split('T')[0]} // Can't be in the future
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Pet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPetModal;
