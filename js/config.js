// Konfigurasi Otomatis Supabase TI24A
const SUPABASE_CONFIG = {
  url: "https://ihxjyilykinndaqvipig.supabase.co",
  anonKey: "sb_publishable_iMitOa-wVFroP2SnPfcAYw_p84L09df"
};

// Inisialisasi Klien Supabase Global
if (typeof supabase !== 'undefined' && supabase.createClient) {
  window.supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
} else {
  console.warn("Library Supabase SDK belum dimuat di index.html");
}

// Simpan otomatis ke localStorage browser pengunjung agar status indikator hijau (Connected)
localStorage.setItem('supabase_url', SUPABASE_CONFIG.url);
localStorage.setItem('supabase_key', SUPABASE_CONFIG.anonKey);