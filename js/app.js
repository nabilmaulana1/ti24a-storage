/**
 * Repositori Berkas — Teknik Informatika TI24A
 * Frontend Client terhubung ke Node.js Backend API
 */

class AcademicRepoApp {
  constructor() {
    this.currentFolderId = 'root';
    this.folderHistory = [{ id: 'root', name: 'Repositori Utama' }];
    this.viewMode = 'grid'; // 'grid' | 'list'
    this.searchQuery = '';
    this.currentPreviewFile = null;
  }

  async init() {
    this.bindEvents();
    await this.render();
  }

  // ==================== RENDER WORKSPACE ====================
  async render() {
    try {
      const url = this.searchQuery 
        ? `/api/drive?search=${encodeURIComponent(this.searchQuery)}`
        : `/api/drive?folderId=${encodeURIComponent(this.currentFolderId)}`;

      const res = await fetch(url);
      const data = await res.json();

      const folders = data.folders || [];
      const files = data.files || [];

      // Update Breadcrumbs
      this.renderBreadcrumbs();

      // Update Header Stats
      this.updateStats();

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
              const iconName = this.getFileIcon(file.extension);
              const badgeClass = this.getFormatBadgeClass(file.extension);
              const dateStr = new Date(file.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

              return `
                <div class="file-card" data-file-id="${file.id}">
                  <div class="file-card-preview-area">
                    <span class="format-badge badge-${badgeClass}">${this.escapeHtml(file.extension.toUpperCase())}</span>
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
              const badgeClass = this.getFormatBadgeClass(file.extension);
              const dateStr = new Date(file.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

              return `
                <div class="file-row" data-file-id="${file.id}">
                  <div class="file-row-left">
                    <span class="format-badge badge-${badgeClass}" style="position: static;">${this.escapeHtml(file.extension.toUpperCase())}</span>
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
      this.showToast('Gagal memuat repositori dari server');
    }
  }

  async updateStats() {
    try {
      const res = await fetch('/api/stats');
      const stats = await res.json();
      const text = `${stats.totalFiles || 0} berkas tersimpan (${this.formatBytes(stats.totalBytes || 0)})`;
      document.getElementById('fileStatsText').textContent = text;
    } catch (e) {
      document.getElementById('fileStatsText').textContent = 'Server Online';
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
    document.getElementById('btnTriggerUpload')?.addEventListener('click', () => {
      fileInput?.click();
    });
    document.getElementById('btnEmptyUpload')?.addEventListener('click', () => {
      fileInput?.click();
    });

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

    document.getElementById('btnSubmitFolder')?.addEventListener('click', () => {
      this.createFolder();
    });

    document.getElementById('newFolderNameInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.createFolder();
      }
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

    document.getElementById('brandHome')?.addEventListener('click', () => {
      this.resetToRoot();
    });

    // 5. Item Clicks (Folders, Files, Delete)
    document.addEventListener('click', async (e) => {
      // Delete Folder
      const btnDelFolder = e.target.closest('.btn-delete-folder');
      if (btnDelFolder) {
        e.stopPropagation();
        const fldId = btnDelFolder.dataset.folderId;
        if (confirm('Apakah Anda yakin ingin menghapus folder ini beserta seluruh isinya?')) {
          await fetch(`/api/folders/${fldId}`, { method: 'DELETE' });
          this.showToast('Folder berhasil dihapus');
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
          await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
          this.showToast('Berkas berhasil dihapus');
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
      if (this.searchQuery) {
        btnClearSearch?.classList.remove('hidden');
      } else {
        btnClearSearch?.classList.add('hidden');
      }
      this.render();
    });

    btnClearSearch?.addEventListener('click', () => {
      searchInput.value = '';
      this.searchQuery = '';
      btnClearSearch.classList.add('hidden');
      this.render();
    });

    // 7. Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.closeModal;
        this.closeModal(modalId);
      });
    });

    // 8. Download from Preview
    document.getElementById('btnDownloadPreview')?.addEventListener('click', () => {
      if (this.currentPreviewFile) {
        window.location.href = `/api/download/${this.currentPreviewFile.id}`;
      }
    });

    // 9. Drag & Drop Fullscreen Overlay
    const overlay = document.getElementById('dragDropOverlay');

    window.addEventListener('dragenter', (e) => {
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        overlay?.classList.remove('hidden');
      }
    });

    overlay?.addEventListener('dragover', (e) => e.preventDefault());
    overlay?.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) {
        overlay?.classList.add('hidden');
      }
    });

    overlay?.addEventListener('drop', (e) => {
      e.preventDefault();
      overlay?.classList.add('hidden');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        this.handleFileUpload(Array.from(e.dataTransfer.files));
      }
    });
  }

  // ==================== FILE OPERATIONS ====================
  async handleFileUpload(files) {
    if (!files || files.length === 0) return;

    this.showToast(`Mengunggah ${files.length} berkas ke server...`);

    const formData = new FormData();
    formData.append('folderId', this.currentFolderId);
    for (const file of files) {
      formData.append('files', file);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Gagal upload');
      this.showToast('Berkas berhasil disimpan di repositori!');
      await this.render();
    } catch (err) {
      console.error('Upload error:', err);
      this.showToast('Terjadi kesalahan saat mengunggah berkas.');
    }
  }

  async createFolder() {
    const input = document.getElementById('newFolderNameInput');
    const name = input?.value.trim();
    if (!name) {
      alert('Silakan masukkan nama folder.');
      return;
    }

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, parentId: this.currentFolderId })
      });

      if (!res.ok) throw new Error('Gagal membuat folder');
      this.closeModal('modalNewFolder');
      if (input) input.value = '';
      this.showToast('Folder berhasil dibuat!');
      await this.render();
    } catch (err) {
      console.error(err);
      this.showToast('Gagal membuat folder di server');
    }
  }

  async openPreview(fileId) {
    try {
      const driveRes = await fetch(`/api/drive?folderId=${this.currentFolderId}`);
      const data = await driveRes.json();
      let file = (data.files || []).find(f => f.id === fileId);

      if (!file) {
        const allRes = await fetch(`/api/drive?search=`);
        const allData = await allRes.json();
        file = (allData.files || []).find(f => f.id === fileId);
      }

      if (!file) return;
      this.currentPreviewFile = file;

      document.getElementById('previewFileName').textContent = file.name;
      document.getElementById('previewBadge').textContent = file.extension.toUpperCase();
      document.getElementById('previewBadge').className = `file-badge badge-${this.getFormatBadgeClass(file.extension)}`;
      document.getElementById('previewMeta').textContent = `${this.formatBytes(file.size)} • Diunggah ${new Date(file.createdAt).toLocaleDateString('id-ID')}`;

      const previewBody = document.getElementById('previewBody');
      const ext = file.extension.toLowerCase();

      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
        // Image Preview
        previewBody.innerHTML = `<img src="/api/preview/${file.id}" alt="${this.escapeHtml(file.name)}" class="preview-image-content">`;
      } else if (ext === 'pdf') {
        // PDF Inline Viewer
        previewBody.innerHTML = `
          <div style="height: 540px; width: 100%;">
            <iframe src="/api/preview/${file.id}" style="width: 100%; height: 100%; border: none; border-radius: 4px; background: white;"></iframe>
          </div>
        `;
      } else if (['txt', 'md', 'py', 'js', 'json', 'csv', 'html', 'css', 'sql', 'java', 'c', 'cpp'].includes(ext)) {
        // Text / Code Fetch Preview
        const textRes = await fetch(`/api/preview/${file.id}`);
        const text = await textRes.text();
        previewBody.innerHTML = `<pre class="preview-text-content">${this.escapeHtml(text)}</pre>`;
      } else {
        // Fallback for docx, pptx, zip, etc.
        previewBody.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem; color: #f8fafc;">
            <i data-lucide="${this.getFileIcon(ext)}" style="width: 56px; height: 56px; color: #60a5fa; margin-bottom: 0.85rem;"></i>
            <h4 style="font-size: 1.1rem; margin-bottom: 0.35rem;">${this.escapeHtml(file.name)}</h4>
            <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.25rem;">Berkas tersimpan aman di server repositori TI24A.</p>
            <a href="/api/download/${file.id}" class="btn btn-primary btn-sm" style="display: inline-flex; text-decoration: none;">
              <i data-lucide="download"></i> Unduh Berkas
            </a>
          </div>
        `;
      }

      this.openModal('modalPreview');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error(err);
      this.showToast('Gagal memuat pratinjau berkas');
    }
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
}

// Start Application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AcademicRepoApp();
  window.app.init();
});
