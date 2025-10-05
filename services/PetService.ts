import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Pet } from '../types/Pet';
import AuthService from './AuthService';

class PetService {
  private static instance: PetService;

  static getInstance(): PetService {
    if (!PetService.instance) {
      PetService.instance = new PetService();
    }
    return PetService.instance;
  }

  async addPet(petData: Omit<Pet, 'id'>): Promise<Pet> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const petDataWithUser = {
        ...petData,
        userId: currentUser.id,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'pets'), petDataWithUser);
      
      return {
        ...petData,
        id: docRef.id
      };
    } catch (error) {
      throw error;
    }
  }

  async getPets(): Promise<Pet[]> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const q = query(
        collection(db, 'pets'),
        where('userId', '==', currentUser.id)
      );

      const querySnapshot = await getDocs(q);
      
      const pets: Pet[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Handle birthdate conversion properly for Firestore timestamps
        let birthdate: Date;
        if (data.birthdate) {
          // If it's a Firestore timestamp, convert it properly
          if (data.birthdate.toDate && typeof data.birthdate.toDate === 'function') {
            birthdate = data.birthdate.toDate();
          } else if (data.birthdate instanceof Date) {
            birthdate = data.birthdate;
          } else {
            birthdate = new Date(data.birthdate);
          }
        } else {
          birthdate = new Date();
        }
        
        pets.push({
          id: doc.id,
          name: data.name,
          breed: data.breed,
          birthdate: birthdate,
          photoURL: data.photoURL,
          createdAt: data.createdAt // Add this for sorting
        });
      });

      // Sort by createdAt in descending order (newest first)
      pets.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      return pets;
    } catch (error) {
      throw error;
    }
  }

  async deletePet(petId: string): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      await deleteDoc(doc(db, 'pets', petId));
    } catch (error) {
      throw error;
    }
  }

  async updatePet(petId: string, updates: Partial<Omit<Pet, 'id'>>): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const petRef = doc(db, 'pets', petId);
      await updateDoc(petRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  }
}

export default PetService.getInstance();
