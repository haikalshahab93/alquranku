import axios from 'axios';

// Hadits API via myQuran v2
const MYQURAN_V2_BASE = 'https://api.myquran.com/v2';

export async function getHaditsArbainSemua() {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/arbain/all`);
  return data;
}

export async function getHaditsArbainNomor(nomor) {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/arbain/${encodeURIComponent(nomor)}`);
  return data;
}

export async function getHaditsArbainAcak() {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/arbain/random`);
  return data;
}

export async function getHaditsBmNomor(nomor) {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/bm/${encodeURIComponent(nomor)}`);
  return data;
}

export async function getHaditsBmAcak() {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/bm/random`);
  return data;
}

export async function getHaditsPerawiList() {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/perawi`);
  return data;
}

export async function getHaditsPerawiNomor(slug, nomor) {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/${encodeURIComponent(slug)}/${encodeURIComponent(nomor)}`);
  return data;
}

export async function getHaditsPerawiAcak() {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/perawi/random`);
  return data;
}