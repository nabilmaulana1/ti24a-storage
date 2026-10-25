/**
 * SimpleDrive Database Engine (IndexedDB)
 * Penyimpanan offline murni di browser tanpa sample data.
 * v2: Tambah field access_mode pada folder (viewer | editor)
 */

const DB_NAME = 'SimpleDriveDB';
const DB_VERSION = 2;

class SimpleDriveDB {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        // Store Folders (v1)
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
          folderStore.createIndex('access_mode', 'access_mode', { unique: false });
        } else if (oldVersion < 2) {
          // Upgrade v1 → v2: tambah index access_mode
          const tx = event.target.transaction;
          const folderStore = tx.objectStore('folders');
          if (!folderStore.indexNames.contains('access_mode')) {
            folderStore.createIndex('access_mode', 'access_mode', { unique: false });
          }
        }

        // Store Files
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('folderId', 'folderId', { unique: false });
          fileStore.createIndex('name', 'name', { unique: false });
          fileStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // ==================== FOLDERS ====================
  async getFolders(parentId = 'root') {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('folders', 'readonly');
      const store = tx.objectStore('folders');
      const index = store.index('parentId');
      const req = index.getAll(parentId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllFolders() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('folders', 'readonly');
      const store = tx.objectStore('folders');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getFolderById(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('folders', 'readonly');
      const store = tx.objectStore('folders');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async addFolder(name, parentId = 'root', accessMode = 'viewer') {
    await this.init();
    const folder = {
      id: 'fld_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      parentId: parentId,
      access_mode: accessMode, // 'viewer' | 'editor'
      createdAt: Date.now()
    };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const req = store.add(folder);
      req.onsuccess = () => resolve(folder);
      req.onerror = () => reject(req.error);
    });
  }

  async updateFolder(folderId, updates) {
    await this.init();
    const folder = await this.getFolderById(folderId);
    if (!folder) throw new Error('Folder tidak ditemukan');
    const updated = { ...folder, ...updates };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const req = store.put(updated);
      req.onsuccess = () => resolve(updated);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFolder(folderId) {
    await this.init();
    // Delete folder and its files
    const files = await this.getFiles(folderId);
    for (const f of files) {
      await this.deleteFile(f.id);
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const req = store.delete(folderId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ==================== FILES ====================
  async getFiles(folderId = 'root') {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const index = store.index('folderId');
      const req = index.getAll(folderId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllFiles() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getFileById(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async addFile(fileData) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const req = store.add(fileData);
      req.onsuccess = () => resolve(fileData);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFile(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // Utilities
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

window.simpleDriveDB = new SimpleDriveDB();
