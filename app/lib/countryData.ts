export type CountryRecord = {
  name: string;
  cca2: string;
  cca3: string;
  capital: string;
  region: string;
  population: number;
  currencies: string;
  gdp: number | null;
};

type RestCountry = {
  name: { common: string };
  cca2: string;
  cca3: string;
  capital?: string[];
  region: string;
  population: number;
  currencies?: Record<string, { name: string }>;
};

type WorldBankEntry = {
  country: { id: string };
  value: number | null;
};

const RESTCOUNTRIES_URL =
  "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,capital,region,population,currencies";
const WORLD_BANK_URL =
  "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=20000";

function buildCurrencyLabel(currencies?: Record<string, { name: string }>) {
  if (!currencies) return "—";
  return Object.values(currencies)
    .map((currency) => currency.name)
    .join(", ");
}

function pickLatestGdp(entries: WorldBankEntry[]) {
  const gdpMap = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.country?.id || entry.value === null) continue;
    if (!gdpMap.has(entry.country.id)) {
      gdpMap.set(entry.country.id, entry.value);
    }
  }
  return gdpMap;
}

export async function getCountries(): Promise<CountryRecord[]> {
  const [restResponse, gdpResponse] = await Promise.all([
    fetch(RESTCOUNTRIES_URL, { next: { revalidate: 3600 } }),
    fetch(WORLD_BANK_URL, { next: { revalidate: 3600 } })
  ]);

  if (!restResponse.ok) {
    throw new Error("Failed to load country metadata.");
  }
  if (!gdpResponse.ok) {
    throw new Error("Failed to load GDP data.");
  }

  const restData = (await restResponse.json()) as RestCountry[];
  const gdpJson = (await gdpResponse.json()) as [unknown, WorldBankEntry[]];
  const gdpEntries = Array.isArray(gdpJson[1]) ? gdpJson[1] : [];
  const gdpMap = pickLatestGdp(gdpEntries);

  return restData
    .filter((country) => country.cca2 && country.cca3)
    .map((country) => {
      return {
        name: country.name.common,
        cca2: country.cca2,
        cca3: country.cca3,
        capital: country.capital?.[0] ?? "—",
        region: country.region || "Other",
        population: country.population,
        currencies: buildCurrencyLabel(country.currencies),
        gdp: gdpMap.get(country.cca2) ?? null
      };
    })
    .sort((a, b) => b.population - a.population);
}
