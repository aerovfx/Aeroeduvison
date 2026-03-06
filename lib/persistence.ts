/**
 * persistence.ts - Data persistence utilities for LMS
 * 
 * Features:
 * - localStorage persistence
 * - Session storage
 * - Data serialization
 * - State management
 * - Cross-tab synchronization
 */

import { apiLogger } from './logging-simple';

// Storage types
export type StorageType = 'localStorage' | 'sessionStorage';

// Storage configuration
const STORAGE_CONFIG = {
  PREFIX: 'lms_',
  VERSION: '1.0.0',
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  COMPRESSION_THRESHOLD: 1024 // 1KB
};

// Storage interface
interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  version: string;
  checksum?: string;
}

// Storage manager class
export class StorageManager {
  private static instance: StorageManager;
  private storage: Storage;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(storageType: StorageType = 'localStorage') {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      // Server-side: create a mock storage
      this.storage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      } as Storage;
    } else {
      this.storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      this.setupCrossTabSync();
    }
  }

  static getInstance(storageType: StorageType = 'localStorage'): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager(storageType);
    }
    return StorageManager.instance;
  }

  // Set data with automatic serialization
  set<T>(key: string, data: T, ttl?: number): boolean {
    try {
      const fullKey = this.getFullKey(key);
      const item: StorageItem<T> = {
        data,
        timestamp: Date.now(),
        version: STORAGE_CONFIG.VERSION,
        checksum: this.generateChecksum(data)
      };

      // Add TTL if specified
      if (ttl) {
        (item as any).expires = Date.now() + ttl;
      }

      const serialized = JSON.stringify(item);
      
      // Check size limit
      if (serialized.length > STORAGE_CONFIG.MAX_SIZE) {
        apiLogger.warn('Storage item too large', {
          metadata: { key, size: serialized.length }
        });
        return false;
      }

      this.storage.setItem(fullKey, serialized);
      
      // Notify listeners
      this.notifyListeners(key, data);
      
      return true;
    } catch (error) {
      apiLogger.error('Failed to set storage item', {
        metadata: { key, error: (error as Error).message }
      });
      return false;
    }
  }

  // Get data with automatic deserialization
  get<T>(key: string): T | null {
    try {
      const fullKey = this.getFullKey(key);
      const item = this.storage.getItem(fullKey);
      
      if (!item) return null;

      const parsed: StorageItem<T> = JSON.parse(item);
      
      // Check version compatibility
      if (parsed.version !== STORAGE_CONFIG.VERSION) {
        apiLogger.warn('Storage version mismatch', {
          metadata: { key, expected: STORAGE_CONFIG.VERSION, actual: parsed.version }
        });
        return null;
      }

      // Check TTL
      if ((parsed as any).expires && Date.now() > (parsed as any).expires) {
        this.remove(key);
        return null;
      }

      // Verify checksum
      if (parsed.checksum && parsed.checksum !== this.generateChecksum(parsed.data)) {
        apiLogger.warn('Storage checksum mismatch', { metadata: { key } });
        return null;
      }

      return parsed.data;
    } catch (error) {
      apiLogger.error('Failed to get storage item', {
        metadata: { key, error: (error as Error).message }
      });
      return null;
    }
  }

  // Remove data
  remove(key: string): boolean {
    try {
      const fullKey = this.getFullKey(key);
      this.storage.removeItem(fullKey);
      this.notifyListeners(key, null);
      return true;
    } catch (error) {
      apiLogger.error('Failed to remove storage item', {
        metadata: { key, error: (error as Error).message }
      });
      return false;
    }
  }

  // Clear all data
  clear(): boolean {
    try {
      const keys = Object.keys(this.storage);
      const lmsKeys = keys.filter(key => key.startsWith(STORAGE_CONFIG.PREFIX));
      
      lmsKeys.forEach(key => this.storage.removeItem(key));
      
      return true;
    } catch (error) {
      apiLogger.error('Failed to clear storage', {
        metadata: { error: (error as Error).message }
      });
      return false;
    }
  }

  // Check if key exists
  has(key: string): boolean {
    const fullKey = this.getFullKey(key);
    return this.storage.getItem(fullKey) !== null;
  }

  // Get all keys
  keys(): string[] {
    const allKeys = Object.keys(this.storage);
    return allKeys
      .filter(key => key.startsWith(STORAGE_CONFIG.PREFIX))
      .map(key => key.substring(STORAGE_CONFIG.PREFIX.length));
  }

  // Get storage size
  getSize(): number {
    const keys = this.keys();
    return keys.reduce((size, key) => {
      const fullKey = this.getFullKey(key);
      const item = this.storage.getItem(fullKey);
      return size + (item ? item.length : 0);
    }, 0);
  }

  // Subscribe to changes
  subscribe<T>(key: string, callback: (data: T | null) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  // Private methods
  private getFullKey(key: string): string {
    return `${STORAGE_CONFIG.PREFIX}${key}`;
  }

  private generateChecksum(data: any): string {
    // Simple checksum for data integrity
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private notifyListeners(key: string, data: any): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          apiLogger.error('Storage listener error', {
            metadata: { key, error: (error as Error).message }
          });
        }
      });
    }
  }

  private setupCrossTabSync(): void {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith(STORAGE_CONFIG.PREFIX)) {
        const key = event.key.substring(STORAGE_CONFIG.PREFIX.length);
        const data = event.newValue ? JSON.parse(event.newValue) : null;
        this.notifyListeners(key, data);
      }
    });
  }
}

// State persistence utilities
export class StatePersistence {
  private storage: StorageManager;

  constructor(storageType: StorageType = 'localStorage') {
    this.storage = StorageManager.getInstance(storageType);
  }

  // Persist state
  persistState<T>(key: string, state: T, ttl?: number): boolean {
    return this.storage.set(key, state, ttl);
  }

  // Restore state
  restoreState<T>(key: string, defaultValue: T): T {
    const stored = this.storage.get<T>(key);
    return stored !== null ? stored : defaultValue;
  }

  // Clear state
  clearState(key: string): boolean {
    return this.storage.remove(key);
  }

  // Subscribe to state changes
  subscribeToState<T>(key: string, callback: (state: T | null) => void): () => void {
    return this.storage.subscribe(key, callback);
  }
}

// Module state persistence
export class ModuleStateManager {
  private persistence: StatePersistence;
  private activeModules: Set<string> = new Set();
  private listeners: Set<(modules: string[]) => void> = new Set();

  constructor() {
    this.persistence = new StatePersistence('localStorage');
    this.loadActiveModules();
  }

  // Set active module
  setActiveModule(module: string, active: boolean): void {
    if (active) {
      this.activeModules.add(module);
    } else {
      this.activeModules.delete(module);
    }
    
    this.saveActiveModules();
    this.notifyListeners();
  }

  // Get active modules
  getActiveModules(): string[] {
    return Array.from(this.activeModules);
  }

  // Check if module is active
  isModuleActive(module: string): boolean {
    return this.activeModules.has(module);
  }

  // Toggle module
  toggleModule(module: string): boolean {
    const isActive = this.isModuleActive(module);
    this.setActiveModule(module, !isActive);
    return !isActive;
  }

  // Clear all modules
  clearAllModules(): void {
    this.activeModules.clear();
    this.saveActiveModules();
    this.notifyListeners();
  }

  // Subscribe to changes
  subscribe(callback: (modules: string[]) => void): () => void {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Private methods
  private loadActiveModules(): void {
    const stored = this.persistence.restoreState<string[]>('active_modules', []);
    this.activeModules = new Set(stored);
  }

  private saveActiveModules(): void {
    this.persistence.persistState('active_modules', Array.from(this.activeModules));
  }

  private notifyListeners(): void {
    const modules = this.getActiveModules();
    this.listeners.forEach(callback => {
      try {
        callback(modules);
      } catch (error) {
        apiLogger.error('Module state listener error', {
          metadata: { error: (error as Error).message }
        });
      }
    });
  }
}

// Data sync persistence
export class DataSyncPersistence {
  private storage: StorageManager;
  private persistence: StatePersistence;

  constructor() {
    this.storage = StorageManager.getInstance('localStorage');
    this.persistence = new StatePersistence('localStorage');
  }

  // Persist sync data
  persistSyncData<T>(key: string, data: T, ttl: number = 300000): boolean {
    return this.storage.set(`sync_${key}`, data, ttl);
  }

  // Restore sync data
  restoreSyncData<T>(key: string): T | null {
    return this.storage.get<T>(`sync_${key}`);
  }

  // Clear sync data
  clearSyncData(key: string): boolean {
    return this.storage.remove(`sync_${key}`);
  }

  // Persist user preferences
  persistUserPreferences(userId: string, preferences: any): boolean {
    return this.persistence.persistState(`user_prefs_${userId}`, preferences);
  }

  // Restore user preferences
  restoreUserPreferences(userId: string, defaultPreferences: any): any {
    return this.persistence.restoreState(`user_prefs_${userId}`, defaultPreferences);
  }

  // Persist dashboard state
  persistDashboardState(userId: string, state: any): boolean {
    return this.persistence.persistState(`dashboard_${userId}`, state);
  }

  // Restore dashboard state
  restoreDashboardState(userId: string, defaultState: any): any {
    return this.persistence.restoreState(`dashboard_${userId}`, defaultState);
  }
}

// Global instances
export const storageManager = StorageManager.getInstance();
export const statePersistence = new StatePersistence();
export const moduleStateManager = new ModuleStateManager();
export const dataSyncPersistence = new DataSyncPersistence();

export default {
  StorageManager,
  StatePersistence,
  ModuleStateManager,
  DataSyncPersistence,
  storageManager,
  statePersistence,
  moduleStateManager,
  dataSyncPersistence
};
