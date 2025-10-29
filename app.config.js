const appJson = require('./app.json');

// Konfigurasi dinamis Expo untuk mengaktifkan LLM tanpa menyimpan key di repo
// Membaca environment variables (prefix EXPO_PUBLIC_) agar tersedia di client
// Cara pakai (PowerShell):
//   $env:EXPO_PUBLIC_LLM_PROVIDER = "openai" // atau "builtin" / "mock"
//   $env:EXPO_PUBLIC_OPENAI_API_KEY = "<ISI_API_KEY>"
//   $env:EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1"
// Lalu restart dev server: npm run web

module.exports = ({ config }) => {
  const extra = {
    ...(appJson.expo?.extra || {}),
    LLM_PROVIDER: process.env.EXPO_PUBLIC_LLM_PROVIDER || 'builtin',
    OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    OPENAI_BASE_URL: process.env.EXPO_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  };

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      extra,
    },
  };
};