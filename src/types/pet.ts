export interface PetProfileData {
  id?: string;
  slug: string;
  shareToken: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  gender: string;
  location: string;
  favoriteFood: string;
  favoriteToy: string;
  personality: string;
  ownerContact: string;
  mainPhoto: string;
}

export const emptyPetProfile: PetProfileData = {
  slug: '',
  shareToken: '',
  name: '',
  breed: '',
  age: '',
  weight: '',
  gender: '',
  location: '',
  favoriteFood: '',
  favoriteToy: '',
  personality: '',
  ownerContact: '',
  mainPhoto: '',
};
