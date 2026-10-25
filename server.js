const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Initialize database file
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = { folders: [], files: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { folders: [], files: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Unique stored filename to prevent overwriting
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + safeExt);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max per file
});

// Serve Frontend Static Files
app.use(express.static(__dirname));

// ==================== API ENDPOINTS ====================

// 1. Get Drive Contents (Folders & Files)
app.get('/api/drive', (req, res) => {
  const folderId = req.query.folderId || 'root';
  const search = (req.query.search || '').trim().toLowerCase();
  const db = readDB();

  if (search) {
    // Global search
    const matchedFolders = db.folders.filter(f => f.name.toLowerCase().includes(search));
    const matchedFiles = db.files.filter(f => f.name.toLowerCase().includes(search));
    return res.json({ folders: matchedFolders, files: matchedFiles });
  }

  // Get contents for specific folder
  const currentFolders = db.folders.filter(f => f.parentId === folderId);
  const currentFiles = db.files.filter(f => f.folderId === folderId);

  res.json({
    folders: currentFolders,
    files: currentFiles
  });
});

// 2. Create New Folder
app.post('/api/folders', (req, res) => {
  const { name, parentId } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama folder harus diisi' });
  }

  const db = readDB();
  const newFolder = {
    id: 'fld_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: name.trim(),
    parentId: parentId || 'root',
    createdAt: Date.now()
  };

  db.folders.push(newFolder);
  writeDB(db);

  res.status(201).json(newFolder);
});

// 3. Delete Folder (Recursive)
app.delete('/api/folders/:id', (req, res) => {
  const folderId = req.params.id;
  const db = readDB();

  // Find all descendant folder IDs recursively
  const foldersToDelete = new Set([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of db.folders) {
      if (foldersToDelete.has(f.parentId) && !foldersToDelete.has(f.id)) {
        foldersToDelete.add(f.id);
        changed = true;
      }
    }
  }

  // Delete physical files belonging to these folders
  const filesToDelete = db.files.filter(f => foldersToDelete.has(f.folderId));
  for (const f of filesToDelete) {
    const filePath = path.join(UPLOADS_DIR, f.storedName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.error(e); }
    }
  }

  // Filter out deleted folders and files
  db.folders = db.folders.filter(f => !foldersToDelete.has(f.id));
  db.files = db.files.filter(f => !foldersToDelete.has(f.folderId));
  writeDB(db);

  res.json({ success: true, deletedFolderCount: foldersToDelete.size, deletedFileCount: filesToDelete.length });
});

// 4. Upload Files
app.post('/api/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
  }

  const folderId = req.body.folderId || 'root';
  const db = readDB();
  const uploadedRecords = [];

  for (const file of req.files) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).replace('.', '').toLowerCase();

    const fileRecord = {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: originalName,
      storedName: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      extension: ext,
      folderId: folderId,
      createdAt: Date.now()
    };

    db.files.push(fileRecord);
    uploadedRecords.push(fileRecord);
  }

  writeDB(db);
  res.status(201).json({ success: true, files: uploadedRecords });
});

// 5. Download File
app.get('/api/download/:id', (req, res) => {
  const fileId = req.params.id;
  const db = readDB();
  const file = db.files.find(f => f.id === fileId);

  if (!file) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }

  const filePath = path.join(UPLOADS_DIR, file.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File fisik tidak ditemukan di server' });
  }

  res.download(filePath, file.name);
});

// 6. Preview / Stream File Inline
app.get('/api/preview/:id', (req, res) => {
  const fileId = req.params.id;
  const db = readDB();
  const file = db.files.find(f => f.id === fileId);

  if (!file) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }

  const filePath = path.join(UPLOADS_DIR, file.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File fisik tidak ditemukan' });
  }

  // Set proper content-type
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
  fs.createReadStream(filePath).pipe(res);
});

// 7. Delete Single File
app.delete('/api/files/:id', (req, res) => {
  const fileId = req.params.id;
  const db = readDB();
  const fileIndex = db.files.findIndex(f => f.id === fileId);

  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }

  const file = db.files[fileIndex];
  const filePath = path.join(UPLOADS_DIR, file.storedName);

  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
  }

  db.files.splice(fileIndex, 1);
  writeDB(db);

  res.json({ success: true });
});

// 8. Stats Endpoint
app.get('/api/stats', (req, res) => {
  const db = readDB();
  let totalBytes = 0;
  db.files.forEach(f => totalBytes += f.size || 0);

  res.json({
    totalFiles: db.files.length,
    totalFolders: db.folders.length,
    totalBytes: totalBytes
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 SimpleDrive Server Aktif di Port: ${PORT}`);
  console.log(`   Lokal: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
