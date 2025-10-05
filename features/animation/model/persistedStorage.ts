import { PersistStorage } from 'zustand/middleware';
import { AnimationState, Frame, PersistedState } from './types';

const dbName = 'zustandDB';
const storeName = 'states';

const openDB = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = (event) =>
      resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) =>
      reject((event.target as IDBOpenDBRequest).error);
  });

export const indexedDBStorage: PersistStorage<PersistedState> = {
  getItem: async (key: string) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) {
          try {
            const parsed = JSON.parse(request.result);
            const state = fromSerializable(parsed.state);
            resolve({ state, version: parsed.version });
          } catch (e) {
            reject(e);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },
  setItem: async (
    key: string,
    value: { state: PersistedState; version: number }
  ) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(
        JSON.stringify({
          state: toSerializable(value.state),
          version: value.version,
        }),
        key
      );
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
  },
  removeItem: async (key: string) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
  },
};

function toSerializable(state: PersistedState) {
  return {
    ...state,
    frames: state.frames.map((frame) => ({
      ...frame,
      layers: frame.layers.map((layer) => ({
        ...layer,
        pixels: Array.from(layer.pixels.entries()),
      })),
    })),
  };
}

function fromSerializable(serial: AnimationState): PersistedState {
  return {
    ...serial,
    frames: serial.frames.map((frame) => ({
      ...frame,
      layers: frame.layers.map((layer) => ({
        ...layer,
        pixels: new Map(layer.pixels),
      })),
    })),
  };
}
