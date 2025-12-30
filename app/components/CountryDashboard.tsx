"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { feature } from "topojson-client";
import type { CountryRecord } from "../lib/countryData";

type SortKey = "name" | "population" | "gdp" | "capital" | "currencies";

const WORLD_TOPOJSON_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const SATELLITE_TILE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

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
  const [worldGeoJson, setWorldGeoJson] = useState<FeatureCollection<Geometry> | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;
    fetch(WORLD_TOPOJSON_URL)
      .then((response) => response.json())
      .then((topology) => {
        const topoObject = (topology as { objects: { countries: unknown } }).objects
          .countries;
        const geoJson = feature(topology, topoObject) as FeatureCollection<Geometry>;
        if (isMounted) {
          setWorldGeoJson(geoJson);
        }
      })
      .catch(() => {
        if (isMounted) {
          setWorldGeoJson(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
        <div className="map-satellite">
          <MapContainer center={[20, 0]} zoom={2} minZoom={1} className="map-container">
            <TileLayer url={SATELLITE_TILE_URL} attribution={SATELLITE_ATTRIBUTION} />
            {worldGeoJson ? (
              <GeoJSON
                data={worldGeoJson}
                style={(featureData) => {
                  const isoA3 =
                    featureData?.properties?.ISO_A3 ??
                    featureData?.properties?.ADM0_A3 ??
                    featureData?.properties?.iso_a3;
                  const isSelected = isoA3 === selectedCca3;
                  return {
                    fillColor: isSelected ? "rgba(56, 189, 248, 0.55)" : "rgba(0, 0, 0, 0.2)",
                    fillOpacity: 1,
                    color: "rgba(255, 255, 255, 0.6)",
                    weight: isSelected ? 1.2 : 0.4
                  };
                }}
              />
            ) : null}
          </MapContainer>
        </div>
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
