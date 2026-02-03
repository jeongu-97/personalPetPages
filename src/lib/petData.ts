import { PetProfileData } from '../types/pet';

export type PetRecord = {
  id: string;
  slug: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  gender: string;
  location: string;
  favorite_food: string;
  favorite_toy: string;
  personality: string;
  health_notes: string;
  main_photo_url: string;
  updated_at?: string;
};

export type PetRecordInput = Omit<PetRecord, 'id' | 'updated_at'> & {
  id?: string;
};

export const toPetProfile = (record: PetRecord): PetProfileData => ({
  id: record.id,
  slug: record.slug,
  name: record.name,
  breed: record.breed,
  age: record.age,
  weight: record.weight,
  gender: record.gender,
  location: record.location,
  favoriteFood: record.favorite_food,
  favoriteToy: record.favorite_toy,
  personality: record.personality,
  healthNotes: record.health_notes,
  mainPhoto: record.main_photo_url,
});

export const toPetRecord = (pet: PetProfileData): PetRecordInput => ({
  id: pet.id,
  slug: pet.slug,
  name: pet.name,
  breed: pet.breed,
  age: pet.age,
  weight: pet.weight,
  gender: pet.gender,
  location: pet.location,
  favorite_food: pet.favoriteFood,
  favorite_toy: pet.favoriteToy,
  personality: pet.personality,
  health_notes: pet.healthNotes,
  main_photo_url: pet.mainPhoto,
});
