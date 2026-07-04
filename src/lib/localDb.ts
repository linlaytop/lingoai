// Local database system - replaces Firebase Firestore
// Uses localStorage for per-user data storage

import type { WordAnalysis, Flashcard, CheckIn, CustomAudio } from '../types';

const DB_PREFIX = 'lingoai_data_';

function getUserKey(uid: string, collection: string): string {
  return `${DB_PREFIX}${uid}_${collection}`;
}

function readCollection<T>(uid: string, collection: string): T[] {
  const key = getUserKey(uid, collection);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function writeCollection<T>(uid: string, collection: string, data: T[]): void {
  const key = getUserKey(uid, collection);
  localStorage.setItem(key, JSON.stringify(data));
}

// Callback system to mimic Firestore onSnapshot
type SnapshotCallback<T> = (data: T[]) => void;
const snapshotCallbacks: Map<string, Set<SnapshotCallback<any>>> = new Map();

function notifySnapshot(uid: string, collection: string) {
  const key = getUserKey(uid, collection);
  const callbacks = snapshotCallbacks.get(key);
  if (callbacks) {
    const data = readCollection(uid, collection);
    callbacks.forEach(cb => cb(data));
  }
}

export const localDb = {
  // Subscribe to collection changes (mimics onSnapshot)
  subscribe<T>(uid: string, collection: string, callback: SnapshotCallback<T>): () => void {
    const key = getUserKey(uid, collection);
    if (!snapshotCallbacks.has(key)) {
      snapshotCallbacks.set(key, new Set());
    }
    snapshotCallbacks.get(key)!.add(callback);
    // Immediately call with current data
    callback(readCollection<T>(uid, collection));
    return () => {
      snapshotCallbacks.get(key)?.delete(callback);
    };
  },

  // Get all documents in a collection
  getCollection<T>(uid: string, collection: string): T[] {
    return readCollection<T>(uid, collection);
  },

  // Set a document (creates or overwrites)
  setDoc<T extends { id?: string }>(uid: string, collection: string, docId: string, data: T): void {
    const items = readCollection<any>(uid, collection);
    const index = items.findIndex(item => item.id === docId);
    const docData = { ...data, id: docId };
    if (index >= 0) {
      items[index] = { ...items[index], ...docData };
    } else {
      items.push(docData);
    }
    writeCollection(uid, collection, items);
    notifySnapshot(uid, collection);
  },

  // Merge into an existing document
  mergeDoc(uid: string, collection: string, docId: string, data: Partial<any>): void {
    const items = readCollection<any>(uid, collection);
    const index = items.findIndex(item => item.id === docId);
    if (index >= 0) {
      items[index] = { ...items[index], ...data, id: docId };
    } else {
      items.push({ ...data, id: docId });
    }
    writeCollection(uid, collection, items);
    notifySnapshot(uid, collection);
  },

  // Delete a document
  deleteDoc(uid: string, collection: string, docId: string): void {
    const items = readCollection<any>(uid, collection);
    const filtered = items.filter(item => item.id !== docId);
    writeCollection(uid, collection, filtered);
    notifySnapshot(uid, collection);
  },

  // Clear all user data
  clearUserData(uid: string): void {
    const collections = ['history', 'flashcards', 'checkIns', 'customAudios', 'settings'];
    collections.forEach(col => {
      localStorage.removeItem(getUserKey(uid, col));
      notifySnapshot(uid, col);
    });
  },

  // Admin: get all user data stats
  getUserStats(uid: string): { flashcards: number; history: number; checkIns: number } {
    return {
      flashcards: readCollection<Flashcard>(uid, 'flashcards').length,
      history: readCollection<WordAnalysis>(uid, 'history').length,
      checkIns: readCollection<CheckIn>(uid, 'checkIns').length,
    };
  },
};
