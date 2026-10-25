/**
 * Konfigurasi Cloud Supabase — Teknik Informatika TI24A
 * Kunci dapat diisi langsung di file ini atau melalui tombol 'Setup Cloud' di web.
 */

window.ENV_CONFIG = {
  // Ganti dengan Project URL dari Supabase (misal: https://xyzcompany.supabase.co)
  SUPABASE_URL: localStorage.getItem('TI24A_SUPABASE_URL') || '',

  // Ganti dengan Project API anon/public key dari Supabase
  SUPABASE_ANON_KEY: localStorage.getItem('TI24A_SUPABASE_KEY') || '',

  // Nama bucket storage di Supabase
  BUCKET_NAME: 'ti24a-files'
};
