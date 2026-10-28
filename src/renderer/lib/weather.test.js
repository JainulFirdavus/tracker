import { afterEach, expect, it, vi } from "vitest";
import { getCurrentWeather, getLocationError } from "./weather";

afterEach(() => vi.unstubAllGlobals());

it("requests current weather for the user's coordinates", async () => {
  const geolocation = {
    getCurrentPosition: vi.fn((success) =>
      success({ coords: { latitude: 47.6, longitude: -122.3 } }),
    ),
  };
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      current: {
        temperature_2m: 18.5,
        relative_humidity_2m: 61,
        wind_speed_10m: 9.2,
      },
      current_units: {
        temperature_2m: "°C",
        wind_speed_10m: "km/h",
      },
    }),
  }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(getCurrentWeather(geolocation)).resolves.toEqual({
    temperature: 18.5,
    temperatureUnit: "°C",
    humidity: 61,
    windSpeed: 9.2,
    windSpeedUnit: "km/h",
  });
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.origin).toBe("https://api.open-meteo.com");
  expect(url.pathname).toBe("/v1/forecast");
  expect(url.searchParams.get("latitude")).toBe("47.6");
  expect(url.searchParams.get("longitude")).toBe("-122.3");
  expect(url.searchParams.get("current")).toBe(
    "temperature_2m,relative_humidity_2m,wind_speed_10m",
  );
  expect(geolocation.getCurrentPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    expect.objectContaining({ maximumAge: 600000 }),
  );
});

it("reports location permission errors clearly", async () => {
  const geolocation = {
    getCurrentPosition: vi.fn((_success, failure) => failure({ code: 1 })),
  };
  await expect(getCurrentWeather(geolocation)).rejects.toEqual({ code: 1 });
  expect(getLocationError({ code: 1 })).toBe(
    "Allow location access to load local weather.",
  );
});
