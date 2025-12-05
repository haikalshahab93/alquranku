const appJson = require('./app.json');

// Konfigurasi dinamis Expo untuk mengaktifkan LLM tanpa menyimpan key di repo
// Membaca environment variables (prefix EXPO_PUBLIC_) agar tersedia di client
// Cara pakai (PowerShell):
//   $env:EXPO_PUBLIC_LLM_PROVIDER = "openai" // atau "builtin" / "mock"
//   $env:EXPO_PUBLIC_OPENAI_API_KEY = "<ISI_API_KEY>"
//   $env:EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1"
//   $env:EXPO_PUBLIC_GOOGLE_CLIENT_ID = "<WEB_CLIENT_ID.apps.googleusercontent.com>"
//   $env:EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID = "<ANDROID_CLIENT_ID.apps.googleusercontent.com>" // opsional
//   $env:EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS = "<IOS_CLIENT_ID.apps.googleusercontent.com>" // opsional
// Lalu restart dev server: npm run web

module.exports = ({ config }) => {
  const extra = {
    ...(appJson.expo?.extra || {}),
    LLM_PROVIDER: process.env.EXPO_PUBLIC_LLM_PROVIDER || 'builtin',
    OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    OPENAI_BASE_URL: process.env.EXPO_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    // Google OAuth client IDs
    // Fallback ke Client ID Web jika env belum disetel agar login di web bisa langsung diuji
    GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '557171092692-f005h6tnlt4fl2gjpmi8ui5ud1u0v679.apps.googleusercontent.com',
    // Fallback ke Client ID Android agar login di Android tidak error saat env belum disetel
    GOOGLE_CLIENT_ID_ANDROID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '557171092692-i2ahb4jee2q4sk8eucpi9rtfg9vgj3vv.apps.googleusercontent.com',
    GOOGLE_CLIENT_ID_IOS: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '',
  };

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      extra,
    },
  };
};