const CSV_FILE = "CODEX TEST - Faculty List.csv";
const WORLD_MAP_FILE = "world-atlas-countries-110m.json";

const departmentFilter = document.getElementById("departmentFilter");
const geoFilter = document.getElementById("geoFilter");
const clearBtn = document.getElementById("clearBtn");
const resultsContainer = document.getElementById("results");
const statusEl = document.getElementById("status");
const mapBaseLayer = document.getElementById("mapBase");
const mapCountriesLayer = document.getElementById("mapCountries");

let allFaculty = [];
const selectedDepartments = new Set();
let allCountries = [];
const mapCountryElements = new Map();

const COUNTRY_COORDINATES = {
  Argentina: [-64, -34],
  Australia: [134, -25],
  Bahrain: [50.55, 26.06],
  Bangladesh: [90.35, 23.68],
  Bolivia: [-64.68, -16.29],
  Brazil: [-51.93, -14.24],
  Bulgaria: [25.49, 42.73],
  Burundi: [29.92, -3.37],
  Cameroon: [12.35, 7.37],
  Canada: [-106.35, 56.13],
  Chile: [-71.54, -35.68],
  China: [104.2, 35.86],
  Colombia: [-74.3, 4.57],
  "Democratic Republic of the Congo": [21.76, -4.04],
  Denmark: [9.5, 56.26],
  Ecuador: [-78.18, -1.83],
  Egypt: [30.8, 26.82],
  Ethiopia: [40.49, 9.15],
  France: [2.21, 46.23],
  Gabon: [11.61, -0.8],
  Georgia: [43.36, 42.31],
  Germany: [10.45, 51.17],
  Ghana: [-1.02, 7.95],
  Greece: [21.82, 39.07],
  Guatemala: [-90.23, 15.78],
  Haiti: [-72.29, 18.97],
  Honduras: [-86.24, 15.2],
  "Hong Kong": [114.17, 22.32],
  India: [78.96, 20.59],
  Indonesia: [113.92, -0.79],
  Ireland: [-8.24, 53.41],
  Israel: [34.85, 31.05],
  Italy: [12.57, 41.87],
  Jamaica: [-77.3, 18.11],
  Japan: [138.25, 36.2],
  Jordan: [36.24, 30.59],
  Kenya: [37.91, -0.02],
  Latvia: [24.6, 56.88],
  Lebanon: [35.86, 33.85],
  Malawi: [34.3, -13.25],
  Mali: [-3.99, 17.57],
  Mexico: [-102.55, 23.63],
  Morocco: [-7.09, 31.79],
  Mozambique: [35.53, -18.67],
  Myanmar: [95.96, 21.92],
  Nepal: [84.12, 28.39],
  Netherlands: [5.29, 52.13],
  "New Zealand": [174.89, -40.9],
  Nigeria: [8.68, 9.08],
  Norway: [8.47, 60.47],
  Oman: [55.98, 21.47],
  Pakistan: [69.35, 30.38],
  Peru: [-75.02, -9.19],
  Philippines: [121.77, 12.88],
  Qatar: [51.18, 25.35],
  Rwanda: [29.87, -1.94],
  "Saudi Arabia": [45.08, 23.89],
  Senegal: [-14.45, 14.5],
  Singapore: [103.82, 1.35],
  Slovenia: [14.99, 46.15],
  "South Africa": [22.94, -30.56],
  "South Korea": [127.77, 35.91],
  Spain: [-3.75, 40.46],
  "Sri Lanka": [80.77, 7.87],
  Sweden: [18.64, 60.13],
  Switzerland: [8.22, 46.82],
  Taiwan: [121, 23.7],
  Tanzania: [34.89, -6.37],
  Thailand: [100.99, 15.87],
  "The Netherlands": [5.29, 52.13],
  Uganda: [32.29, 1.37],
  "United Arab Emirates": [53.85, 23.42],
  "United Kingdom": [-3.44, 55.38],
  Uzbekistan: [64.59, 41.38],
  Vanuatu: [166.96, -15.38],
  Vietnam: [108.28, 14.06],
  Zambia: [27.85, -13.13],
  Zimbabwe: [29.15, -19.02],
};

const COUNTRY_NAME_ALIASES = {
  "Democratic Republic of the Congo": "Congo",
  "The Netherlands": "Netherlands",
};

init();

async function init() {
  try {
    const response = await fetch(CSV_FILE);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = parseCsv(csvText);

    allFaculty = rows
      .map(normalizeRow)
      .filter((row) => row.name)
      .sort(sortFaculty);

    populateFilters(allFaculty);
    await initializeWorldMap();
    bindEvents();
    render();
  } catch (error) {
    statusEl.textContent = `Error loading faculty data: ${error.message}`;
  }
}

function bindEvents() {
  geoFilter.addEventListener("change", render);
  clearBtn.addEventListener("click", () => {
    selectedDepartments.clear();
    Array.from(departmentFilter.querySelectorAll("button")).forEach((button) => {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    clearSelection(geoFilter);
    render();
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] || "").trim();
    });
    return record;
  });
}

function normalizeRow(row) {
  const countries = splitTokens(row.countries_normalized);

  return {
    name: row.name || "",
    department: row.primary_department || "",
    countries,
    description: row.focus_areas || "",
  };
}

function splitTokens(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function populateFilters(facultyList) {
  const departments = uniqueSorted(
    facultyList.map((f) => f.department).filter(Boolean)
  );
  allCountries = uniqueSorted(facultyList.flatMap((f) => f.countries));

  addDepartmentButtons(departments);
  addOptions(geoFilter, allCountries);
}

function uniqueSorted(items) {
  return [...new Set(items)].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function addOptions(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function addDepartmentButtons(values) {
  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = value;
    button.dataset.value = value;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (selectedDepartments.has(value)) {
        selectedDepartments.delete(value);
        button.classList.remove("active");
        button.setAttribute("aria-pressed", "false");
      } else {
        selectedDepartments.add(value);
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
      }
      render();
    });
    departmentFilter.appendChild(button);
  });
}

function setOptions(select, values, selectedValues = new Set()) {
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = selectedValues.has(value);
    select.appendChild(option);
  });
}

function getDepartmentMatches() {
  return allFaculty.filter(
    (person) =>
      selectedDepartments.size === 0 || selectedDepartments.has(person.department)
  );
}

function updateCountryFilterOptions(departmentMatches) {
  const availableCountries =
    selectedDepartments.size === 0
      ? allCountries
      : uniqueSorted(departmentMatches.flatMap((person) => person.countries));

  const selectedGeos = getSelectedValues(geoFilter);
  const stillValidSelections = new Set(
    [...selectedGeos].filter((country) => availableCountries.includes(country))
  );

  setOptions(geoFilter, availableCountries, stillValidSelections);
}

async function initializeWorldMap() {
  try {
    const response = await fetch(WORLD_MAP_FILE);
    if (!response.ok) {
      throw new Error(`Failed to load world map: ${response.status}`);
    }

    const topology = await response.json();
    const countryFeatures = topologyToFeatures(topology);
    const pathByName = new Map();

    countryFeatures.forEach((feature) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", feature.path);
      path.setAttribute("class", "map-base-country");
      mapBaseLayer.appendChild(path);
      pathByName.set(feature.name, path);
    });

    allCountries.forEach((country) => {
      const canonicalName = COUNTRY_NAME_ALIASES[country] || country;
      const existingPath = pathByName.get(canonicalName);

      if (existingPath) {
        existingPath.classList.add("map-country");
        existingPath.dataset.country = country;
        existingPath.appendChild(makeTitle(country));
        makeMapCountryInteractive(existingPath, country);
        mapCountryElements.set(country, existingPath);
        return;
      }

      const fallback = buildFallbackCountryPath(country);
      fallback.classList.add("map-country", "fallback-country");
      fallback.dataset.country = country;
      fallback.appendChild(makeTitle(country));
      makeMapCountryInteractive(fallback, country);
      mapCountriesLayer.appendChild(fallback);
      mapCountryElements.set(country, fallback);
    });
  } catch (error) {
    mapBaseLayer.innerHTML = "";
    mapCountriesLayer.innerHTML = "";
    allCountries.forEach((country) => {
      const fallback = buildFallbackCountryPath(country);
      fallback.classList.add("map-country", "fallback-country");
      fallback.dataset.country = country;
      fallback.appendChild(makeTitle(country));
      makeMapCountryInteractive(fallback, country);
      mapCountriesLayer.appendChild(fallback);
      mapCountryElements.set(country, fallback);
    });
    console.error(error);
  }
}

function makeMapCountryInteractive(element, country) {
  element.addEventListener("click", () => {
    if (element.classList.contains("available")) {
      toggleCountrySelection(country);
    }
  });
  element.addEventListener("keydown", (event) => {
    if (!element.classList.contains("available")) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleCountrySelection(country);
    }
  });
}

function makeTitle(country) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = country;
  return title;
}

function buildFallbackCountryPath(country) {
  const [x, y] = projectCountry(country);
  const size = 5;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    `M${x},${y - size} L${x + size},${y} L${x},${y + size} L${x - size},${y} Z`
  );
  return path;
}

function topologyToFeatures(topology) {
  const transform = topology.transform;
  const decodedArcs = decodeArcs(topology.arcs, transform.scale, transform.translate);
  const geometries = topology.objects.countries.geometries;

  return geometries.map((geometry) => {
    const polygons = geometryToPolygons(geometry, decodedArcs);
    return {
      name: geometry.properties?.name || geometry.id,
      path: polygonsToPath(polygons),
    };
  });
}

function decodeArcs(arcs, scale, translate) {
  return arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
}

function geometryToPolygons(geometry, decodedArcs) {
  if (geometry.type === "Polygon") {
    return [polygonArcsToRings(geometry.arcs, decodedArcs)];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.arcs.map((polygonArcs) =>
      polygonArcsToRings(polygonArcs, decodedArcs)
    );
  }
  return [];
}

function polygonArcsToRings(polygonArcs, decodedArcs) {
  return polygonArcs.map((ringArcs) => combineArcs(ringArcs, decodedArcs));
}

function combineArcs(arcIndexes, decodedArcs) {
  const ring = [];
  arcIndexes.forEach((index, arcIndex) => {
    const arc = index >= 0 ? decodedArcs[index] : [...decodedArcs[~index]].reverse();
    const points = arcIndex === 0 ? arc : arc.slice(1);
    ring.push(...points);
  });
  return ring;
}

function polygonsToPath(polygons) {
  return polygons
    .map((rings) =>
      rings
        .map((ring) =>
          ring
            .map((point, index) => {
              const [x, y] = projectLonLat(point);
              return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ") + " Z"
        )
        .join(" ")
    )
    .join(" ");
}

function projectLonLat([longitude, latitude]) {
  const x = ((longitude + 180) / 360) * 1000;
  const y = ((90 - latitude) / 180) * 500;
  return [Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(500, y))];
}

function projectCountry(country) {
  const coordinates = COUNTRY_COORDINATES[country] || fallbackCoordinates(country);
  return projectLonLat(coordinates);
}

function fallbackCoordinates(country) {
  const hash = hashCountry(country);
  const longitude = (hash % 320) - 160;
  const latitude = ((Math.floor(hash / 320) % 120) - 60) * 0.9;
  return [longitude, latitude];
}

function hashCountry(country) {
  let hash = 0;
  for (let i = 0; i < country.length; i += 1) {
    hash = (hash * 31 + country.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function updateMapSelection(selectedCountries, availableCountries) {
  allCountries.forEach((country) => {
    const element = mapCountryElements.get(country);
    if (!element) {
      return;
    }

    const isAvailable = availableCountries.has(country);
    const isSelected = selectedCountries.has(country);

    element.classList.remove("available", "unavailable", "selected");
    element.classList.add(isAvailable ? "available" : "unavailable");

    if (isSelected) {
      element.classList.add("selected");
    }

    if (isAvailable) {
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
    } else {
      element.removeAttribute("tabindex");
      element.removeAttribute("role");
    }
  });
}

function toggleCountrySelection(country) {
  const option = Array.from(geoFilter.options).find((opt) => opt.value === country);
  if (!option) {
    return;
  }
  option.selected = !option.selected;
  render();
}

function getSelectedValues(select) {
  return new Set(Array.from(select.selectedOptions, (opt) => opt.value));
}

function clearSelection(select) {
  Array.from(select.options).forEach((opt) => {
    opt.selected = false;
  });
}

function sortFaculty(a, b) {
  return (
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
    a.department.localeCompare(b.department, undefined, { sensitivity: "base" })
  );
}

function render() {
  const departmentMatches = getDepartmentMatches();

  updateCountryFilterOptions(departmentMatches);
  const selectedGeos = getSelectedValues(geoFilter);
  const availableCountries = new Set(Array.from(geoFilter.options, (opt) => opt.value));
  updateMapSelection(selectedGeos, availableCountries);

  const filtered = departmentMatches.filter((person) => {
    const geoPasses =
      selectedGeos.size === 0 ||
      person.countries.some((token) => selectedGeos.has(token));

    return geoPasses;
  });

  statusEl.textContent = `Showing ${filtered.length} of ${allFaculty.length} faculty members.`;

  if (filtered.length === 0) {
    resultsContainer.innerHTML = "<p>No faculty match the current filters.</p>";
    return;
  }

  resultsContainer.innerHTML = filtered.map(renderCard).join("");
}

function renderCard(person) {
  const departmentText = person.department || "Not specified";
  const countryText = person.countries.length
    ? person.countries.join(", ")
    : "Not specified";
  const descriptionText = person.description || "No description provided.";

  return `
    <article class="card">
      <h2>${escapeHtml(person.name)}</h2>
      <p class="meta"><strong>Department:</strong> ${escapeHtml(departmentText)}</p>
      <p class="meta"><strong>Countries:</strong> ${escapeHtml(countryText)}</p>
      <p class="description">${escapeHtml(descriptionText)}</p>
    </article>
  `;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
