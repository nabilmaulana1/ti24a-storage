/**
 * Repositori Berkas — Teknik Informatika TI24A
 * Cloud Engine untuk Netlify (Supabase Cloud + IndexedDB Smart Fallback)
 */

class AcademicRepoApp {
  constructor() {
    this.currentFolderId = 'root';
    this.folderHistory = [{ id: 'root', name: 'Repositori Utama' }];
    this.viewMode = 'grid'; // 'grid' | 'list'
    this.searchQuery = '';
    this.currentPreviewFile = null;
    this.supabase = null;
    this.isCloudConnected = false;
  }

  async init() {
    this.initCloudClient();
    this.bindEvents();
    await this.render();
  }

  // ==================== SUPABASE / CLOUD INIT ====================
  initCloudClient() {
    const url = window.ENV_CONFIG?.SUPABASE_URL || localStorage.getItem('TI24A_SUPABASE_URL');
    const key = window.ENV_CONFIG?.SUPABASE_ANON_KEY || localStorage.getItem('TI24A_SUPABASE_KEY');

    const statusDot = document.getElementById('cloudStatusDot');
    const statusLabel = document.getElementById('cloudStatusLabel');

    if (window.supabase && url && key) {
      try {
        this.supabase = window.supabase.createClient(url, key);
        this.isCloudConnected = true;
        if (statusDot) statusDot.classList.add('connected');
        if (statusLabel) statusLabel.textContent = 'Cloud Aktif';
        console.log('✅ Supabase Cloud Engine Terhubung');
      } catch (err) {
        console.warn('Gagal inisialisasi Supabase, beralih ke IndexedDB:', err);
        this.isCloudConnected = false;
        if (statusDot) statusDot.classList.remove('connected');
        if (statusLabel) statusLabel.textContent = 'Setup Cloud';
      }
    } else {
      this.isCloudConnected = false;
      if (statusDot) statusDot.classList.remove('connected');
      if (statusLabel) statusLabel.textContent = 'Setup Cloud';
    }
  }

  // ==================== RENDER WORKSPACE ====================
  async render() {
    try {
      let folders = [];
      let files = [];

      if (this.isCloudConnected) {
        // Mode 1: Supabase Cloud (Multi-User Shared)
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          const { data: allFolders } = await this.supabase.from('folders').select('*');
          const { data: allFiles } = await this.supabase.from('files').select('*');
          folders = (allFolders || []).filter(f => f.name.toLowerCase().includes(q));
          files = (allFiles || []).filter(f => f.name.toLowerCase().includes(q));
        } else {
          const { data: fldData } = await this.supabase.from('folders').select('*').eq('parent_id', this.currentFolderId);
          const { data: filData } = await this.supabase.from('files').select('*').eq('folder_id', this.currentFolderId);
          folders = fldData || [];
          files = filData || [];
        }
      } else {
        // Mode 2: IndexedDB Local Engine
        await window.simpleDriveDB.init();
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          const allFlds = await window.simpleDriveDB.getAllFolders();
          const allFils = await window.simpleDriveDB.getAllFiles();
          folders = allFlds.filter(f => f.name.toLowerCase().includes(q));
          files = allFils.filter(f => f.name.toLowerCase().includes(q));
        } else {
          folders = await window.simpleDriveDB.getFolders(this.currentFolderId);
          files = await window.simpleDriveDB.getFiles(this.currentFolderId);
        }
      }

      // Update Breadcrumbs
      this.renderBreadcrumbs();

      // Update Header Stats
      await this.updateStats();

      const emptyState = document.getElementById('emptyState');
      const foldersSection = document.getElementById('foldersSection');
      const filesSection = document.getElementById('filesSection');

      if (folders.length === 0 && files.length === 0) {
        emptyState.classList.remove('hidden');
        foldersSection.classList.add('hidden');
        filesSection.classList.add('hidden');

        const titleEl = document.getElementById('emptyTitle');
        const descEl = document.getElementById('emptyDesc');

        if (this.searchQuery) {
          titleEl.textContent = 'Tidak Ditemukan';
          descEl.textContent = `Tidak ada berkas atau folder yang cocok dengan pencarian "${this.searchQuery}".`;
        } else {
          titleEl.textContent = 'Repositori Masih Kosong';
          descEl.innerHTML = 'Belum ada materi perkuliahan atau berkas tugas yang diunggah untuk kelas <strong>TI24A</strong>. Mulai simpan berkas dengan mengklik tombol di bawah atau seret file langsung ke halaman ini.';
        }
      } else {
        emptyState.classList.add('hidden');

        // 1. Render Folders
        if (folders.length > 0) {
          foldersSection.classList.remove('hidden');
          const container = document.getElementById('foldersContainer');
          container.innerHTML = folders.map(f => `
            <div class="folder-tile" data-folder-id="${f.id}" title="${this.escapeHtml(f.name)}">
              <div class="folder-tile-left">
                <div class="folder-tile-icon"><i data-lucide="folder"></i></div>
                <span class="folder-tile-name">${this.escapeHtml(f.name)}</span>
              </div>
              <button class="btn-tile-delete btn-delete-folder" data-folder-id="${f.id}" title="Hapus Folder">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          `).join('');
        } else {
          foldersSection.classList.add('hidden');
        }

        // 2. Render Files
        if (files.length > 0) {
          filesSection.classList.remove('hidden');
          const filesContainer = document.getElementById('filesContainer');
          filesContainer.className = `files-wrapper ${this.viewMode === 'grid' ? 'grid-view' : 'list-view'}`;

          if (this.viewMode === 'grid') {
            filesContainer.innerHTML = files.map(file => {
              const ext = file.extension || 'file';
              const iconName = this.getFileIcon(ext);
              const badgeClass = this.getFormatBadgeClass(ext);
              const dateStr = new Date(file.created_at || file.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

              return `
                <div class="file-card" data-file-id="${file.id}">
                  <div class="file-card-preview-area">
                    <span class="format-badge badge-${badgeClass}">${this.escapeHtml(ext.toUpperCase())}</span>
                    <i data-lucide="${iconName}"></i>
                  </div>
                  <div class="file-card-body">
                    <div class="file-meta-group">
                      <div class="file-card-title" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</div>
                      <div class="file-card-subtext">${this.formatBytes(file.size)} • ${dateStr}</div>
                    </div>
                    <button class="btn-tile-delete btn-delete-file" data-file-id="${file.id}" title="Hapus Berkas">
                      <i data-lucide="trash-2"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('');
          } else {
            filesContainer.innerHTML = files.map(file => {
              const ext = file.extension || 'file';
              const badgeClass = this.getFormatBadgeClass(ext);
              const dateStr = new Date(file.created_at || file.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

              return `
                <div class="file-row" data-file-id="${file.id}">
                  <div class="file-row-left">
                    <span class="format-badge badge-${badgeClass}" style="position: static;">${this.escapeHtml(ext.toUpperCase())}</span>
                    <span class="file-row-title" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</span>
                  </div>
                  <div class="file-row-right">
                    <span>${dateStr}</span>
                    <span>${this.formatBytes(file.size)}</span>
                    <button class="btn-tile-delete btn-delete-file" data-file-id="${file.id}" title="Hapus Berkas">
                      <i data-lucide="trash-2"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('');
          }
        } else {
          filesSection.classList.add('hidden');
        }
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (err) {
      console.error('Error rendering repository:', err);
      this.showToast('Gagal memuat repositori');
    }
  }

  async updateStats() {
    try {
      let count = 0;
      let totalBytes = 0;

      if (this.isCloudConnected) {
        const { data } = await this.supabase.from('files').select('size');
        count = (data || []).length;
        (data || []).forEach(f => totalBytes += (f.size || 0));
      } else {
        const allF = await window.simpleDriveDB.getAllFiles();
        count = allF.length;
        allF.forEach(f => totalBytes += (f.size || 0));
      }

      document.getElementById('fileStatsText').textContent = `${count} berkas (${this.formatBytes(totalBytes)})`;
    } catch (e) {
      document.getElementById('fileStatsText').textContent = 'Online';
    }
  }

  renderBreadcrumbs() {
    const breadcrumbs = document.getElementById('breadcrumbTrail');
    if (!breadcrumbs) return;

    if (this.searchQuery) {
      breadcrumbs.innerHTML = `<span class="crumb active">Pencarian: "${this.escapeHtml(this.searchQuery)}"</span>`;
      return;
    }

    breadcrumbs.innerHTML = this.folderHistory.map((item, index) => {
      const isLast = index === this.folderHistory.length - 1;
      const icon = index === 0 ? '<i data-lucide="home"></i> ' : '';
      return `
        ${index > 0 ? '<span class="crumb-separator">/</span>' : ''}
        <span class="crumb ${isLast ? 'active' : ''}" data-folder-index="${index}">${icon}${this.escapeHtml(item.name)}</span>
      `;
    }).join('');
  }

  // ==================== EVENT LISTENERS ====================
  bindEvents() {
    // 1. Upload Triggers
    const fileInput = document.getElementById('globalFileInput');
    document.getElementById('btnTriggerUpload')?.addEventListener('click', () => fileInput?.click());
    document.getElementById('btnEmptyUpload')?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFileUpload(Array.from(e.target.files));
        fileInput.value = '';
      }
    });

    // 2. New Folder Triggers
    document.getElementById('btnTriggerNewFolder')?.addEventListener('click', () => {
      this.openModal('modalNewFolder');
      document.getElementById('newFolderNameInput')?.focus();
    });
    document.getElementById('btnEmptyFolder')?.addEventListener('click', () => {
      this.openModal('modalNewFolder');
      document.getElementById('newFolderNameInput')?.focus();
    });

    document.getElementById('btnSubmitFolder')?.addEventListener('click', () => this.createFolder());
    document.getElementById('newFolderNameInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.createFolder();
    });

    // 3. View Toggles (Grid vs List)
    document.getElementById('btnGridView')?.addEventListener('click', () => {
      this.viewMode = 'grid';
      document.getElementById('btnGridView')?.classList.add('active');
      document.getElementById('btnListView')?.classList.remove('active');
      this.render();
    });

    document.getElementById('btnListView')?.addEventListener('click', () => {
      this.viewMode = 'list';
      document.getElementById('btnListView')?.classList.add('active');
      document.getElementById('btnGridView')?.classList.remove('active');
      this.render();
    });

    // 4. Navigation & Breadcrumb Clicks
    document.getElementById('breadcrumbTrail')?.addEventListener('click', (e) => {
      const crumb = e.target.closest('.crumb');
      if (crumb && crumb.dataset.folderIndex !== undefined) {
        const index = parseInt(crumb.dataset.folderIndex, 10);
        this.folderHistory = this.folderHistory.slice(0, index + 1);
        this.currentFolderId = this.folderHistory[this.folderHistory.length - 1].id;
        this.searchQuery = '';
        document.getElementById('searchInput').value = '';
        this.render();
      }
    });

    document.getElementById('brandHome')?.addEventListener('click', () => this.resetToRoot());

    // 5. Item Clicks (Folders, Files, Delete)
    document.addEventListener('click', async (e) => {
      // Delete Folder
      const btnDelFolder = e.target.closest('.btn-delete-folder');
      if (btnDelFolder) {
        e.stopPropagation();
        const fldId = btnDelFolder.dataset.folderId;
        if (confirm('Apakah Anda yakin ingin menghapus folder ini beserta seluruh isinya?')) {
          await this.deleteFolder(fldId);
          await this.render();
        }
        return;
      }

      // Delete File
      const btnDelFile = e.target.closest('.btn-delete-file');
      if (btnDelFile) {
        e.stopPropagation();
        const fileId = btnDelFile.dataset.fileId;
        if (confirm('Apakah Anda yakin ingin menghapus berkas ini?')) {
          await this.deleteFile(fileId);
          await this.render();
        }
        return;
      }

      // Enter Folder
      const folderTile = e.target.closest('.folder-tile');
      if (folderTile) {
        const fldId = folderTile.dataset.folderId;
        const folderName = folderTile.querySelector('.folder-tile-name')?.textContent || 'Folder';
        this.currentFolderId = fldId;
        this.folderHistory.push({ id: fldId, name: folderName });
        this.searchQuery = '';
        document.getElementById('searchInput').value = '';
        await this.render();
        return;
      }

      // Open File Preview
      const fileCard = e.target.closest('.file-card, .file-row');
      if (fileCard) {
        const fileId = fileCard.dataset.fileId;
        this.openPreview(fileId);
        return;
      }
    });

    // 6. Search Input
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');

    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      btnClearSearch?.classList.toggle('hidden', !this.searchQuery);
      this.render();
    });

    btnClearSearch?.addEventListener('click', () => {
      searchInput.value = '';
      this.searchQuery = '';
      btnClearSearch.classList.add('hidden');
      this.render();
    });

    // 7. Cloud Settings Modal
    document.getElementById('btnOpenCloudSettings')?.addEventListener('click', () => {
      const curUrl = localStorage.getItem('TI24A_SUPABASE_URL') || window.ENV_CONFIG?.SUPABASE_URL || '';
      const curKey = localStorage.getItem('TI24A_SUPABASE_KEY') || window.ENV_CONFIG?.SUPABASE_ANON_KEY || '';
      document.getElementById('inputSupabaseUrl').value = curUrl;
      document.getElementById('inputSupabaseKey').value = curKey;
      this.openModal('modalCloudSettings');
    });

    document.getElementById('btnSaveCloudConfig')?.addEventListener('click', async () => {
      const url = document.getElementById('inputSupabaseUrl').value.trim();
      const key = document.getElementById('inputSupabaseKey').value.trim();

      if (!url || !key) {
        alert('Mohon masukkan Supabase Project URL dan Anon Key!');
        return;
      }

      localStorage.setItem('TI24A_SUPABASE_URL', url);
      localStorage.setItem('TI24A_SUPABASE_KEY', key);

      window.ENV_CONFIG.SUPABASE_URL = url;
      window.ENV_CONFIG.SUPABASE_ANON_KEY = key;

      this.initCloudClient();
      this.closeModal('modalCloudSettings');
      this.showToast('Konfigurasi Cloud disimpan! Memuat data...');
      await this.render();
    });

    // 8. Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.closeModal;
        this.closeModal(modalId);
      });
    });

    // 9. Download from Preview
    document.getElementById('btnDownloadPreview')?.addEventListener('click', () => {
      if (this.currentPreviewFile) {
        this.downloadFile(this.currentPreviewFile);
      }
    });

    // 10. Drag & Drop Fullscreen Overlay
    const overlay = document.getElementById('dragDropOverlay');
    window.addEventListener('dragenter', (e) => {
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        overlay?.classList.remove('hidden');
      }
    });

    overlay?.addEventListener('dragover', (e) => e.preventDefault());
    overlay?.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) overlay?.classList.add('hidden');
    });

    overlay?.addEventListener('drop', (e) => {
      e.preventDefault();
      overlay?.classList.add('hidden');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        this.handleFileUpload(Array.from(e.dataTransfer.files));
      }
    });
  }

  // ==================== FILE & FOLDER OPERATIONS ====================
  async handleFileUpload(files) {
    if (!files || files.length === 0) return;

    this.showToast(`Mengunggah ${files.length} berkas...`);

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const fileId = 'file_' + timestamp + '_' + Math.random().toString(36).substr(2, 5);

      if (this.isCloudConnected) {
        // --- UPLOAD KE SUPABASE CLOUD ---
        try {
          const bucket = window.ENV_CONFIG.BUCKET_NAME || 'ti24a-files';
          const storagePath = `${this.currentFolderId}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

          // 1. Upload to Supabase Storage Bucket
          const { error: uploadError } = await this.supabase.storage
            .from(bucket)
            .upload(storagePath, file, { upsert: true });

          if (uploadError) throw uploadError;

          // 2. Get Public URL
          const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(storagePath);
          const publicUrl = urlData.publicUrl;

          // 3. Insert record into Supabase Table
          const { error: dbError } = await this.supabase.from('files').insert([{
            id: fileId,
            name: file.name,
            folder_id: this.currentFolderId,
            size: file.size,
            extension: ext,
            storage_path: storagePath,
            public_url: publicUrl,
            created_at: timestamp
          }]);

          if (dbError) throw dbError;
        } catch (err) {
          console.error('Supabase upload error:', err);
          this.showToast(`Gagal upload cloud (${file.name}): ` + (err.message || 'Error'));
          return;
        }
      } else {
        // --- FALLBACK KE INDEXEDDB LOKAL ---
        let textContent = null;
        let dataUrl = null;

        if (['txt', 'md', 'py', 'js', 'json', 'csv', 'html', 'css', 'sql'].includes(ext)) {
          try { textContent = await file.text(); } catch (e) {}
        }
        if (file.type.startsWith('image/')) {
          try { dataUrl = await this.readFileAsDataURL(file); } catch (e) {}
        }

        await window.simpleDriveDB.addFile({
          id: fileId,
          name: file.name,
          folderId: this.currentFolderId,
          size: file.size,
          type: file.type || 'application/octet-stream',
          extension: ext,
          createdAt: timestamp,
          fileBlob: file,
          textContent: textContent,
          dataUrl: dataUrl
        });
      }
    }

    this.showToast('Berkas berhasil disimpan!');
    await this.render();
  }

  async createFolder() {
    const input = document.getElementById('newFolderNameInput');
    const name = input?.value.trim();
    if (!name) {
      alert('Silakan masukkan nama folder.');
      return;
    }

    const folderId = 'fld_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    if (this.isCloudConnected) {
      try {
        const { error } = await this.supabase.from('folders').insert([{
          id: folderId,
          name: name,
          parent_id: this.currentFolderId,
          created_at: Date.now()
        }]);
        if (error) throw error;
      } catch (err) {
        console.error('Create folder error:', err);
        this.showToast('Gagal membuat folder di cloud: ' + err.message);
        return;
      }
    } else {
      await window.simpleDriveDB.addFolder(name, this.currentFolderId);
    }

    this.closeModal('modalNewFolder');
    if (input) input.value = '';
    this.showToast('Folder berhasil dibuat!');
    await this.render();
  }

  async deleteFolder(folderId) {
    if (this.isCloudConnected) {
      try {
        await this.supabase.from('folders').delete().eq('id', folderId);
        await this.supabase.from('files').delete().eq('folder_id', folderId);
        this.showToast('Folder berhasil dihapus');
      } catch (err) {
        console.error(err);
      }
    } else {
      await window.simpleDriveDB.deleteFolder(folderId);
      this.showToast('Folder berhasil dihapus');
    }
  }

  async deleteFile(fileId) {
    if (this.isCloudConnected) {
      try {
        const { data: file } = await this.supabase.from('files').select('*').eq('id', fileId).single();
        if (file && file.storage_path) {
          const bucket = window.ENV_CONFIG.BUCKET_NAME || 'ti24a-files';
          await this.supabase.storage.from(bucket).remove([file.storage_path]);
        }
        await this.supabase.from('files').delete().eq('id', fileId);
        this.showToast('Berkas berhasil dihapus');
      } catch (err) {
        console.error(err);
      }
    } else {
      await window.simpleDriveDB.deleteFile(fileId);
      this.showToast('Berkas berhasil dihapus');
    }
  }

  async openPreview(fileId) {
    try {
      let file = null;

      if (this.isCloudConnected) {
        const { data } = await this.supabase.from('files').select('*').eq('id', fileId).single();
        file = data;
      } else {
        file = await window.simpleDriveDB.getFileById(fileId);
      }

      if (!file) return;
      this.currentPreviewFile = file;

      const ext = (file.extension || '').toLowerCase();
      document.getElementById('previewFileName').textContent = file.name;
      document.getElementById('previewBadge').textContent = ext.toUpperCase();
      document.getElementById('previewBadge').className = `file-badge badge-${this.getFormatBadgeClass(ext)}`;
      document.getElementById('previewMeta').textContent = `${this.formatBytes(file.size)} • Diunggah ${new Date(file.created_at || file.createdAt).toLocaleDateString('id-ID')}`;

      const previewBody = document.getElementById('previewBody');

      if (file.public_url) {
        // Cloud Supabase Preview
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
          previewBody.innerHTML = `<img src="${file.public_url}" alt="${this.escapeHtml(file.name)}" class="preview-image-content">`;
        } else if (ext === 'pdf') {
          previewBody.innerHTML = `
            <div style="height: 540px; width: 100%;">
              <iframe src="${file.public_url}" style="width: 100%; height: 100%; border: none; border-radius: 4px; background: white;"></iframe>
            </div>
          `;
        } else if (['txt', 'md', 'py', 'js', 'json', 'csv', 'html', 'css', 'sql', 'cpp', 'java'].includes(ext)) {
          const textRes = await fetch(file.public_url);
          const text = await textRes.text();
          previewBody.innerHTML = `<pre class="preview-text-content">${this.escapeHtml(text)}</pre>`;
        } else {
          previewBody.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: #f8fafc;">
              <i data-lucide="${this.getFileIcon(ext)}" style="width: 56px; height: 56px; color: #60a5fa; margin-bottom: 0.85rem;"></i>
              <h4 style="font-size: 1.1rem; margin-bottom: 0.35rem;">${this.escapeHtml(file.name)}</h4>
              <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.25rem;">Berkas tersimpan di Cloud Supabase.</p>
              <a href="${file.public_url}" target="_blank" download="${file.name}" class="btn btn-primary btn-sm" style="display: inline-flex; text-decoration: none;">
                <i data-lucide="download"></i> Unduh Berkas
              </a>
            </div>
          `;
        }
      } else {
        // Local IndexedDB Preview
        if (file.dataUrl) {
          previewBody.innerHTML = `<img src="${file.dataUrl}" alt="${this.escapeHtml(file.name)}" class="preview-image-content">`;
        } else if (file.textContent !== null) {
          previewBody.innerHTML = `<pre class="preview-text-content">${this.escapeHtml(file.textContent)}</pre>`;
        } else {
          previewBody.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: #f8fafc;">
              <i data-lucide="${this.getFileIcon(ext)}" style="width: 56px; height: 56px; color: #60a5fa; margin-bottom: 0.85rem;"></i>
              <h4 style="font-size: 1.1rem; margin-bottom: 0.35rem;">${this.escapeHtml(file.name)}</h4>
              <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.25rem;">Berkas tersimpan lokal di browser Anda.</p>
              <button class="btn btn-primary btn-sm" onclick="window.app.downloadFile(window.app.currentPreviewFile)">
                <i data-lucide="download"></i> Unduh Berkas
              </button>
            </div>
          `;
        }
      }

      this.openModal('modalPreview');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error(err);
      this.showToast('Gagal memuat pratinjau berkas');
    }
  }

  downloadFile(file) {
    if (!file) return;

    if (file.public_url) {
      const a = document.createElement('a');
      a.href = file.public_url;
      a.target = '_blank';
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Local IndexedDB download
    let blob;
    if (file.fileBlob instanceof Blob) {
      blob = file.fileBlob;
    } else if (file.textContent) {
      blob = new Blob([file.textContent], { type: file.type || 'text/plain' });
    } else {
      blob = new Blob([''], { type: 'application/octet-stream' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Mengunduh: ${file.name}`);
  }

  resetToRoot() {
    this.currentFolderId = 'root';
    this.folderHistory = [{ id: 'root', name: 'Repositori Utama' }];
    this.searchQuery = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    document.getElementById('btnClearSearch')?.classList.add('hidden');
    this.render();
  }

  // ==================== HELPERS ====================
  openModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileIcon(ext) {
    switch (ext) {
      case 'pdf': return 'file-text';
      case 'doc':
      case 'docx': return 'file-text';
      case 'ppt':
      case 'pptx': return 'presentation';
      case 'xls':
      case 'xlsx': return 'sheet';
      case 'py':
      case 'js':
      case 'html':
      case 'css':
      case 'json':
      case 'sql':
      case 'cpp':
      case 'java': return 'file-code';
      case 'zip':
      case 'rar':
      case '7z': return 'archive';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp': return 'image';
      default: return 'file';
    }
  }

  getFormatBadgeClass(ext) {
    switch (ext.toLowerCase()) {
      case 'pdf': return 'pdf';
      case 'py':
      case 'js':
      case 'html':
      case 'css':
      case 'json':
      case 'sql':
      case 'cpp':
      case 'java': return 'code';
      case 'doc':
      case 'docx':
      case 'ppt':
      case 'pptx':
      case 'xls':
      case 'xlsx': return 'doc';
      case 'zip':
      case 'rar':
      case '7z': return 'zip';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp': return 'img';
      default: return 'file';
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

// Start Application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AcademicRepoApp();
  window.app.init();
});
