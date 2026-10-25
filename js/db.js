/**
 * SimpleDrive Database Engine (IndexedDB)
 * Penyimpanan offline murni di browser tanpa sample data.
 */

const DB_NAME = 'SimpleDriveDB';
const DB_VERSION = 1;

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

        // Store Folders
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
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

  async addFolder(name, parentId = 'root') {
    await this.init();
    const folder = {
      id: 'fld_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      parentId: parentId,
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
