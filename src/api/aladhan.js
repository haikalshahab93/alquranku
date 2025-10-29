import axios from 'axios';

// Aladhan (city-based)
const ALADHAN_CITY_BASE = 'https://api.aladhan.com/v1';

export async function getAladhanHarianCity(city, country, dateIso, method = 2) {
  // dateIso: yyyy-mm-dd
  const url = `${ALADHAN_CITY_BASE}/timingsByCity/${encodeURIComponent(dateIso)}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  const { data } = await axios.get(url);
  const d = data?.data || {};
  const timetable = d?.timings || {};
  const meta = d?.meta || d?.metaData || {};
  const hijri = d?.date?.hijri || {};
  const readable = d?.date?.readable;
  const date = (d?.date?.gregorian?.date || readable || dateIso).replace(/\u0000/g, '');

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

export async function getAladhanBulananCity(city, country, year, month, method = 2) {
  const url = `${ALADHAN_CITY_BASE}/calendarByCity/${encodeURIComponent(year)}/${encodeURIComponent(month)}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
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