// Konfigurasi Kredensial Otomatis Supabase TI24A
window.SUPABASE_URL = "https://ihxjyilykinndaqvipig.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_iMitOa-wVFroP2SnPfcAYw_p84L09df";

// Set LocalStorage bawaan
localStorage.setItem('supabase_url', window.SUPABASE_URL);
localStorage.setItem('supabase_key', window.SUPABASE_ANON_KEY);
localStorage.setItem('supabase_connected', 'true');

// Inisialisasi Supabase Client Global
if (typeof supabase !== 'undefined' && supabase.createClient) {
  window.supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}