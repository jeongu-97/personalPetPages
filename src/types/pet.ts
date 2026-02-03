export interface PetProfileData {
  id?: string;
  slug: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  gender: string;
  location: string;
  favoriteFood: string;
  favoriteToy: string;
  personality: string;
  healthNotes: string;
  mainPhoto: string;
}

export const emptyPetProfile: PetProfileData = {
  slug: '',
  name: '',
  breed: '',
  age: '',
  weight: '',
  gender: '',
  location: '',
  favoriteFood: '',
  favoriteToy: '',
  personality: '',
  healthNotes: '',
  mainPhoto: '',
};
