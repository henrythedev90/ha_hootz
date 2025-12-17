import { Presentation } from '@/types';

const STORAGE_KEY = 'ha-hootz-presentations';

export function getAllPresentations(): Presentation[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading presentations from storage:', error);
    return [];
  }
}

export function savePresentation(presentation: Presentation): void {
  if (typeof window === 'undefined') return;
  
  try {
    const presentations = getAllPresentations();
    const existingIndex = presentations.findIndex(p => p.id === presentation.id);
    
    if (existingIndex >= 0) {
      presentations[existingIndex] = presentation;
    } else {
      presentations.push(presentation);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presentations));
  } catch (error) {
    console.error('Error saving presentation to storage:', error);
  }
}

export function getPresentationById(id: string): Presentation | null {
  const presentations = getAllPresentations();
  return presentations.find(p => p.id === id) || null;
}

export function deletePresentation(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const presentations = getAllPresentations();
    const filtered = presentations.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting presentation from storage:', error);
  }
}

