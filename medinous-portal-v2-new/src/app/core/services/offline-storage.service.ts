import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  private dbName = 'medinous_portal';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('medications')) {
          db.createObjectStore('medications', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('medication_logs')) {
          db.createObjectStore('medication_logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('payments_cache')) {
          db.createObjectStore('payments_cache', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('documents_cache')) {
          db.createObjectStore('documents_cache', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  put<T>(storeName: string, data: T): Observable<T> {
    return from(this.putAsync(storeName, data));
  }

  private async putAsync<T>(storeName: string, data: T): Promise<T> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  getAll<T>(storeName: string): Observable<T[]> {
    return from(this.getAllAsync<T>(storeName)).pipe(
      catchError(() => of([]))
    );
  }

  private async getAllAsync<T>(storeName: string): Promise<T[]> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  get<T>(storeName: string, key: string): Observable<T | undefined> {
    return from(this.getAsync<T>(storeName, key)).pipe(
      catchError(() => of(undefined))
    );
  }

  private async getAsync<T>(storeName: string, key: string): Promise<T | undefined> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  delete(storeName: string, key: string): Observable<void> {
    return from(this.deleteAsync(storeName, key));
  }

  private async deleteAsync(storeName: string, key: string): Promise<void> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  addToSyncQueue(action: { type: string; data: unknown }): Observable<void> {
    return this.put('sync_queue', { ...action, timestamp: Date.now() }).pipe(map(() => undefined));
  }

  private async ensureDb(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }
}
