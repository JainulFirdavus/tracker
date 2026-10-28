function getCoordinates(geolocation) {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(({ coords }) => resolve(coords), reject, {
      enableHighAccuracy: false,
      maximumAge: 600000,
      timeout: 15000,
    });
  });
}

export async function getCurrentWeather(geolocation = navigator.geolocation) {
  if (!geolocation) {
    throw new Error("Location services are not available in this browser.");
  }
  const { latitude, longitude } = await getCoordinates(geolocation);
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${query}`,
  );
  if (!response.ok) {
    throw new Error(`Weather service returned HTTP ${response.status}.`);
  }
  const data = await response.json();
  if (
    !data.current ||
    !Number.isFinite(data.current.temperature_2m) ||
    !Number.isFinite(data.current.relative_humidity_2m) ||
    !Number.isFinite(data.current.wind_speed_10m)
  ) {
    throw new Error("Weather service returned incomplete current conditions.");
  }
  return {
    temperature: data.current.temperature_2m,
    temperatureUnit: data.current_units?.temperature_2m ?? "°C",
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windSpeedUnit: data.current_units?.wind_speed_10m ?? "km/h",
  };
}

export function getLocationError(error) {
  if (error?.code === 1) return "Allow location access to load local weather.";
  if (error?.code === 2)
    return "Your current location could not be determined.";
  if (error?.code === 3) return "Location request timed out. Try again.";
  return error?.message || "Could not load local weather.";
}
