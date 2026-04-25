import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type WeatherData = {
  tempCelsius: number;
  humidityPct: number;
  windKph: number;
  altitudeM: number;
  locationName: string;
  fetchedAt: number;
};

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: WeatherData }
  | { status: 'error'; message: string };

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const GEOCODE_BASE = 'https://nominatim.openstreetmap.org';

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `${GEOCODE_BASE}/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'User-Agent': 'FORGE-TacticalApp/1.0' } },
    );
    const json = await res.json();
    const addr = json.address;
    return addr?.city ?? addr?.town ?? addr?.village ?? addr?.county ?? 'Unknown location';
  } catch {
    return 'Unknown location';
  }
}

async function fetchWeatherAndAltitude(lat: number, lon: number): Promise<WeatherData> {
  const [weatherRes, elevRes] = await Promise.all([
    fetch(
      `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`,
    ),
    fetch(`${OPEN_METEO_BASE}/elevation?latitude=${lat}&longitude=${lon}`),
  ]);

  if (!weatherRes.ok) throw new Error(`Weather API ${weatherRes.status}`);

  const [weather, elev, locationName] = await Promise.all([
    weatherRes.json(),
    elevRes.json(),
    reverseGeocode(lat, lon),
  ]);

  const current = weather.current;
  const altitudeM = Array.isArray(elev?.elevation) ? Math.round(elev.elevation[0]) : 0;

  return {
    tempCelsius: Math.round(current.temperature_2m * 10) / 10,
    humidityPct: Math.round(current.relative_humidity_2m),
    windKph: Math.round(current.wind_speed_10m * 10) / 10,
    altitudeM,
    locationName,
    fetchedAt: Date.now(),
  };
}

export function useWeather() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setState({ status: 'loading' });

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({ status: 'error', message: 'Location permission denied' });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const data = await fetchWeatherAndAltitude(
        pos.coords.latitude,
        pos.coords.longitude,
      );

      setState({ status: 'success', data });
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Failed to fetch weather';
      setState({ status: 'error', message: msg });
    }
  }, []);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  return { state, refresh: fetch };
}
