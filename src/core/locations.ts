export interface RitimLocation {
  name: string;
  latitude: number;
  longitude: number;
}

/** Province centres. District-level differences are small; users can enter custom coordinates. */
export const TURKEY_LOCATIONS: RitimLocation[] = [
  { name: "Adana", latitude: 37.0, longitude: 35.3213 },
  { name: "Ankara", latitude: 39.9334, longitude: 32.8597 },
  { name: "Antalya", latitude: 36.8969, longitude: 30.7133 },
  { name: "Bursa", latitude: 40.1885, longitude: 29.061 },
  { name: "Diyarbakır", latitude: 37.9144, longitude: 40.2306 },
  { name: "Erzurum", latitude: 39.9043, longitude: 41.2679 },
  { name: "Eskişehir", latitude: 39.7767, longitude: 30.5206 },
  { name: "Gaziantep", latitude: 37.0662, longitude: 37.3833 },
  { name: "İstanbul", latitude: 41.0082, longitude: 28.9784 },
  { name: "İzmir", latitude: 38.4237, longitude: 27.1428 },
  { name: "Kayseri", latitude: 38.7348, longitude: 35.4672 },
  { name: "Konya", latitude: 37.8746, longitude: 32.4932 },
  { name: "Malatya", latitude: 38.3552, longitude: 38.3095 },
  { name: "Mersin", latitude: 36.8, longitude: 34.6333 },
  { name: "Samsun", latitude: 41.2867, longitude: 36.33 },
  { name: "Trabzon", latitude: 41.0027, longitude: 39.7168 },
  { name: "Van", latitude: 38.5012, longitude: 43.3729 },
];

export const CUSTOM_LOCATION = "Özel konum";

export function findLocation(name: string): RitimLocation | undefined {
  return TURKEY_LOCATIONS.find((location) => location.name === name);
}
