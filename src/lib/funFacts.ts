import { PetProfileData } from '../types/pet';

const formatBirthDateForFunFacts = (value?: string) => {
  const raw = (value ?? '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/\./g, '-').replace(/\//g, '-');
  const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return '';
  return `${matched[1]}.${matched[2]}.${matched[3]}`;
};

const firstNonEmptyLine = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? '';

export const buildDefaultFunFacts = (
  pet: Pick<PetProfileData, 'name' | 'favoriteToy' | 'personality' | 'birthDate'>
) => {
  const name = (pet.name ?? '').trim() || '우리 아이';
  const favoriteToy = (pet.favoriteToy ?? '').trim() || '애착 장난감';
  const personalityLine = firstNonEmptyLine(pet.personality ?? '') || '애교가 많아요';
  const birthDate = formatBirthDateForFunFacts(pet.birthDate);

  return [
    `${name}(가)를 처음 만난다면 ${favoriteToy}(을)를 준비해보세요!`,
    personalityLine,
    birthDate
      ? `생일을 축하해주고 싶다면 ${birthDate}을 기억해주세요!`
      : '생일 정보는 아직 입력되지 않았어요.',
  ];
};
