/**
 * SimpleDrive Auth — Sistem Autentikasi Admin Sederhana
 * Menggunakan password yang disimpan sebagai string terenkripsi sederhana
 * (kompatibel dengan file://, http://, dan https://)
 *
 * CARA GANTI PASSWORD:
 * 1. Tentukan password baru Anda (contoh: "passwordBaru123")
 * 2. Encode ke base64 di browser console: btoa("passwordBaru123")
 * 3. Tempel hasil base64 ke ADMIN_PASS_B64 di bawah
 */

// Ini adalah base64 dari password: admin123
// Untuk ganti password, jalankan di console browser: btoa("password_baru_anda")
const ADMIN_PASS_B64 = 'YWRtaW4xMjM=';

class SimpleDriveAuth {
  constructor() {
    this.SESSION_KEY = 'SD_ADMIN_SESSION';
    this.SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 jam
  }

  /**
   * Cek apakah sesi admin masih aktif
   */
  isAdmin() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (!session || !session.expiry) return false;
      if (Date.now() > session.expiry) {
        sessionStorage.removeItem(this.SESSION_KEY);
        return false;
      }
      return session.valid === true;
    } catch {
      return false;
    }
  }

  /**
   * Login dengan password — returns true jika berhasil
   */
  login(password) {
    // Bandingkan password dengan yang tersimpan (lewat base64 encoding)
    const inputEncoded = btoa(String(password));
    if (inputEncoded === ADMIN_PASS_B64) {
      const session = {
        valid: true,
        expiry: Date.now() + this.SESSION_DURATION_MS
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return true;
    }
    return false;
  }

  /**
   * Logout admin
   */
  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  }
}

window.simpleDriveAuth = new SimpleDriveAuth();
