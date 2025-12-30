"use client";

import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  type Geography as GeographyType
} from "react-simple-maps";
import type { CountryRecord } from "../lib/countryData";

type SortKey = "name" | "population" | "gdp" | "capital" | "currencies";

const WORLD_TOPOJSON =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export default function CountryDashboard({ countries }: { countries: CountryRecord[] }) {
  const [selectedCountry, setSelectedCountry] = useState<CountryRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("population");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const regions = useMemo(() => {
    const regionSet = new Set(countries.map((country) => country.region));
    return ["All", ...Array.from(regionSet).sort()];
  }, [countries]);

  const filteredCountries = useMemo(() => {
    return countries
      .filter((country) => {
        const matchesSearch = country.name
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase());
        const matchesRegion = regionFilter === "All" || country.region === regionFilter;
        return matchesSearch && matchesRegion;
      })
      .sort((a, b) => {
        const multiplier = sortDirection === "asc" ? 1 : -1;
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * multiplier;
        }
        return String(aValue).localeCompare(String(bValue)) * multiplier;
      });
  }, [countries, searchTerm, regionFilter, sortKey, sortDirection]);

  const selectedCca3 = selectedCountry?.cca3 ?? null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "name" || key === "capital" ? "asc" : "desc");
  };

  return (
    <div className="dashboard">
      <section className="map-panel">
        <div className="map-header">
          <div>
            <h2>Interactive world map</h2>
            <p className="map-caption">
              Tap a country in the table to spotlight it on the map.
            </p>
          </div>
          {selectedCountry ? (
            <span className="badge">
              {selectedCountry.name} · {selectedCountry.capital}
            </span>
          ) : (
            <span className="badge">Select a country below</span>
          )}
        </div>
        <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "auto" }}>
          <Geographies geography={WORLD_TOPOJSON}>
            {({ geographies }) =>
              geographies.map((geo: GeographyType) => {
                const isSelected = geo.properties?.ISO_A3 === selectedCca3;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSelected ? "#38bdf8" : "#d9e2ec"}
                    stroke="#ffffff"
                    strokeWidth={0.6}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#7dd3fc", outline: "none" },
                      pressed: { fill: "#38bdf8", outline: "none" }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </section>

      <section className="table-panel">
        <div className="table-controls">
          <input
            type="search"
            placeholder="Search countries"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <select
            value={`${sortKey}:${sortDirection}`}
            onChange={(event) => {
              const [key, direction] = event.target.value.split(":") as [SortKey, "asc" | "desc"];
              setSortKey(key);
              setSortDirection(direction);
            }}
          >
            <option value="population:desc">Population (high to low)</option>
            <option value="population:asc">Population (low to high)</option>
            <option value="gdp:desc">GDP (high to low)</option>
            <option value="gdp:asc">GDP (low to high)</option>
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
          </select>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => handleSort("name")}>
                    Country
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort("population")}>
                    Population
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort("gdp")}>
                    GDP
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort("capital")}>
                    Capital
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort("currencies")}>
                    Currency
                  </button>
                </th>
                <th>Region</th>
              </tr>
            </thead>
            <tbody>
              {filteredCountries.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No countries match your filters.</div>
                  </td>
                </tr>
              ) : (
                filteredCountries.map((country) => {
                  const isSelected = selectedCountry?.cca3 === country.cca3;
                  return (
                    <tr
                      key={country.cca3}
                      className={isSelected ? "selected" : undefined}
                      onClick={() => setSelectedCountry(country)}
                    >
                      <td>{country.name}</td>
                      <td>{numberFormatter.format(country.population)}</td>
                      <td>
                        {country.gdp
                          ? currencyFormatter.format(country.gdp)
                          : "Not available"}
                      </td>
                      <td>{country.capital}</td>
                      <td>{country.currencies}</td>
                      <td>{country.region}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
