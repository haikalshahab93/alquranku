import axios from 'axios';

// Aladhan (city-based)
const ALADHAN_CITY_BASE = 'https://api.aladhan.com/v1';

// PENTING: API v1 mem-parsing parameter tanggal sebagai DD-MM-YYYY. Input
// ISO "2026-09-12" malah ditafsirkan "12 Sep 2012" (tahun salah!) sehingga
// selisih waktu jadwal jadi jutaan menit. Selalu kirim DD-MM-YYYY.
function toApiDate(dateIso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(dateIso || '');
}

// Respons API berformat DD-MM-YYYY — normalisasi ke ISO (YYYY-MM-DD) agar
// new Date(), hitungan "menuju/sudah lewat", dan tampilan tanggal benar.
function normalizeDateOut(raw, fallbackIso) {
  const s = String(raw || '').replace(/\u0000/g, '');
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s || fallbackIso;
}

// Helper to normalize 4th arg: allow number (method) or options object
function normalizeOptions(methodOrOptions) {
  if (typeof methodOrOptions === 'number') {
    return { method: methodOrOptions };
  }
  const opt = methodOrOptions || {};
  return {
    method: opt.method ?? 3,
    timezonestring: opt.timezonestring,
    tune: opt.tune,
    school: opt.school,
    midnightMode: opt.midnightMode,
    latitudeAdjustmentMethod: opt.latitudeAdjustmentMethod,
    calendarMethod: opt.calendarMethod,
    shafaq: opt.shafaq,
  };
}

export async function getAladhanHarianCity(city, country, dateIso, methodOrOptions = {}) {
  // dateIso: yyyy-mm-dd
  const { method, timezonestring, tune, school, midnightMode, latitudeAdjustmentMethod, calendarMethod, shafaq } = normalizeOptions(methodOrOptions);
  let url = `${ALADHAN_CITY_BASE}/timingsByCity/${encodeURIComponent(toApiDate(dateIso))}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  if (timezonestring) url += `&timezonestring=${encodeURIComponent(timezonestring)}`;
  if (tune) url += `&tune=${encodeURIComponent(tune)}`;
  if (school != null) url += `&school=${encodeURIComponent(school)}`;
  if (midnightMode != null) url += `&midnightMode=${encodeURIComponent(midnightMode)}`;
  if (latitudeAdjustmentMethod != null) url += `&latitudeAdjustmentMethod=${encodeURIComponent(latitudeAdjustmentMethod)}`;
  if (calendarMethod != null) url += `&calendarMethod=${encodeURIComponent(calendarMethod)}`;
  if (shafaq) url += `&shafaq=${encodeURIComponent(shafaq)}`;
  const { data } = await axios.get(url);
  const d = data?.data || {};
  const timetable = d?.timings || {};
  const meta = d?.meta || d?.metaData || {};
  const hijri = d?.date?.hijri || {};
  const readable = d?.date?.readable;
  const date = normalizeDateOut(d?.date?.gregorian?.date || readable, dateIso);

  const jadwal = {
    imsak: timetable.Imsak,
    subuh: timetable.Fajr,
    terbit: timetable.Sunrise,
    dzuhur: timetable.Dhuhr,
    ashar: timetable.Asr,
    maghrib: timetable.Maghrib,
    isya: timetable.Isha,
    sunset: timetable.Sunset,
    midnight: timetable.Midnight,
    firstthird: timetable.Firstthird,
    lastthird: timetable.Lastthird,
  };

  const lokasi = `${city}, ${country}`;
  const metaOut = {
    latitude: meta?.latitude,
    longitude: meta?.longitude,
    timezone: meta?.timezone,
    method: method,
  };

  return {
    data: {
      lokasi,
      date,
      hijri: {
        date: hijri?.date,
        month: hijri?.month,
        year: hijri?.year,
      },
      jadwal,
      meta: metaOut,
    },
  };
}

export async function getAladhanBulananCity(city, country, year, month, methodOrOptions = {}) {
  const { method, timezonestring, tune, school, midnightMode, latitudeAdjustmentMethod, calendarMethod, shafaq } = normalizeOptions(methodOrOptions);
  let url = `${ALADHAN_CITY_BASE}/calendarByCity/${encodeURIComponent(year)}/${encodeURIComponent(month)}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  if (timezonestring) url += `&timezonestring=${encodeURIComponent(timezonestring)}`;
  if (tune) url += `&tune=${encodeURIComponent(tune)}`;
  if (school != null) url += `&school=${encodeURIComponent(school)}`;
  if (midnightMode != null) url += `&midnightMode=${encodeURIComponent(midnightMode)}`;
  if (latitudeAdjustmentMethod != null) url += `&latitudeAdjustmentMethod=${encodeURIComponent(latitudeAdjustmentMethod)}`;
  if (calendarMethod != null) url += `&calendarMethod=${encodeURIComponent(calendarMethod)}`;
  if (shafaq) url += `&shafaq=${encodeURIComponent(shafaq)}`;
  const { data } = await axios.get(url);
  const arr = Array.isArray(data?.data) ? data.data : [];
  return {
    data: arr.map((item) => {
      const t = item?.timings || {};
      const gdate = item?.date?.gregorian?.date || '';
      return {
        masihi: gdate,
        imsak: t.Imsak,
        subuh: t.Fajr,
        terbit: t.Sunrise,
        dzuhur: t.Dhuhr,
        ashar: t.Asr,
        maghrib: t.Maghrib,
        isya: t.Isha,
        sunset: t.Sunset,
        midnight: t.Midnight,
        firstthird: t.Firstthird,
        lastthird: t.Lastthird,
      };
    }),
  };
}

export async function getAladhanQibla(lat, lon) {
  const url = `https://api.aladhan.com/v1/qibla/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;
  const { data } = await axios.get(url);
  const deg = data?.data?.direction;
  return typeof deg === 'number' ? deg : null;
}

export async function getAladhanHarianCoords(lat, lon, dateIso, methodOrOptions = {}) {
  // dateIso: yyyy-mm-dd
  const { method, timezonestring, tune, school, midnightMode, latitudeAdjustmentMethod, calendarMethod, shafaq } = normalizeOptions(methodOrOptions);
  let url = `${ALADHAN_CITY_BASE}/timings/${encodeURIComponent(toApiDate(dateIso))}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&method=${method}`;
  if (timezonestring) url += `&timezonestring=${encodeURIComponent(timezonestring)}`;
  if (tune) url += `&tune=${encodeURIComponent(tune)}`;
  if (school != null) url += `&school=${encodeURIComponent(school)}`;
  if (midnightMode != null) url += `&midnightMode=${encodeURIComponent(midnightMode)}`;
  if (latitudeAdjustmentMethod != null) url += `&latitudeAdjustmentMethod=${encodeURIComponent(latitudeAdjustmentMethod)}`;
  if (calendarMethod != null) url += `&calendarMethod=${encodeURIComponent(calendarMethod)}`;
  if (shafaq) url += `&shafaq=${encodeURIComponent(shafaq)}`;
  const { data } = await axios.get(url);
  const d = data?.data || {};
  const timetable = d?.timings || {};
  const meta = d?.meta || d?.metaData || {};
  const hijri = d?.date?.hijri || {};
  const readable = d?.date?.readable;
  const date = normalizeDateOut(d?.date?.gregorian?.date || readable, dateIso);

  const jadwal = {
    imsak: timetable.Imsak,
    subuh: timetable.Fajr,
    terbit: timetable.Sunrise,
    dzuhur: timetable.Dhuhr,
    ashar: timetable.Asr,
    maghrib: timetable.Maghrib,
    isya: timetable.Isha,
    sunset: timetable.Sunset,
    midnight: timetable.Midnight,
    firstthird: timetable.Firstthird,
    lastthird: timetable.Lastthird,
  };

  const lokasi = `${lat}, ${lon}`;
  const metaOut = {
    latitude: meta?.latitude ?? lat,
    longitude: meta?.longitude ?? lon,
    timezone: meta?.timezone,
    method: method,
  };

  return {
    data: {
      lokasi,
      date,
      hijri: {
        date: hijri?.date,
        month: hijri?.month,
        year: hijri?.year,
      },
      jadwal,
      meta: metaOut,
    },
  };
}