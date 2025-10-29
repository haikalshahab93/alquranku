import axios from 'axios';

// Doa API from EQuran
const DOA_BASE = 'https://equran.id/api/doa';

export async function getDoaList({ grup, tag } = {}) {
  const params = {};
  if (grup) params.grup = grup;
  if (tag) params.tag = tag;
  const { data } = await axios.get(DOA_BASE, { params });
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

export async function getDoaDetail(id) {
  const iid = parseInt(id, 10);
  if (Number.isNaN(iid)) {
    return { data: null };
  }
  const { data } = await axios.get(`${DOA_BASE}/${iid}`);
  const detail = data?.data ?? data;
  return { data: detail };
}