import CountryDashboard from "./components/CountryDashboard";
import { getCountries } from "./lib/countryData";

export default async function HomePage() {
  const countries = await getCountries();

  return (
    <main>
      <header>
        <h1>World data explorer</h1>
        <p className="subtitle">
          Browse population, GDP, capitals, and currencies. Select a row to highlight the
          country on the map.
        </p>
      </header>
      <CountryDashboard countries={countries} />
    </main>
  );
}
