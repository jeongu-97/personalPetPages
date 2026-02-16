export interface PetComment {
  author: string;
  text: string;
  authorUserId?: string;
  authorSlug?: string;
  authorShareToken?: string;
  createdAt?: string;
}

export type PetKind = '' | 'dog' | 'cat' | 'bird' | 'fish';

export interface PetProfileData {
  id?: string;
  creatorUserId?: string;
  slug: string;
  shareToken: string;
  petKind?: PetKind;
  backgroundColor?: string;
  accentColor?: string;
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
  backgroundColor: '',
  accentColor: '',
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
