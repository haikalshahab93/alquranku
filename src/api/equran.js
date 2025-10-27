import axios from 'axios';

const api = axios.create({
  baseURL: 'https://equran.id/api/v2',
  timeout: 15000,
});

const unwrap = (res) => {
  // v2 menggunakan wrapper { code, message, data }
  if (res && res.data && typeof res.data === 'object' && 'data' in res.data) {
    return res.data.data;
  }
  return res.data;
};

export async function getSuratList() {
  const res = await api.get('/surat');
  return unwrap(res);
}

export async function getSuratDetail(nomor) {
  const res = await api.get(`/surat/${nomor}`);
  return unwrap(res);
}

export async function getTafsir(nomor) {
  const res = await api.get(`/tafsir/${nomor}`);
  return unwrap(res);
}

const doaApi = axios.create({
  baseURL: 'https://equran.id',
  timeout: 15000,
});

export async function getDoaList(params = {}) {
  const res = await doaApi.get('/api/doa', { params });
  return res.data;
}

export async function getDoaDetail(id) {
  const res = await doaApi.get(`/api/doa/${id}`);
  return res.data;
}

export default {
  getSuratList,
  getSuratDetail,
  getTafsir,
  getDoaList,
  getDoaDetail,
};