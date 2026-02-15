export interface PetComment {
  author: string;
  text: string;
}

export type PetKind = '' | 'dog' | 'cat' | 'bird' | 'fish';

export interface PetProfileData {
  id?: string;
  slug: string;
  shareToken: string;
  petKind?: PetKind;
  name: string;
  birthDate?: string;
  breed: string;
  age: string;
  weight: string;
  gender: string;
  location: string;
  favoriteFood: string;
  favoriteToy: string;
  funFacts: string[];
  comments: PetComment[];
  personality: string;
  ownerContact: string;
  mainPhoto: string;
}

export const emptyPetProfile: PetProfileData = {
  slug: '',
  shareToken: '',
  petKind: '',
  name: '',
  birthDate: '',
  breed: '',
  age: '',
  weight: '',
  gender: '',
  location: '',
  favoriteFood: '',
  favoriteToy: '',
  funFacts: [],
  comments: [],
  personality: '',
  ownerContact: '',
  mainPhoto: '',
};
