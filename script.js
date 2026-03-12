const CSV_FILE = "CODEX TEST - Faculty List.csv";

const departmentFilter = document.getElementById("departmentFilter");
const geoFilter = document.getElementById("geoFilter");
const clearBtn = document.getElementById("clearBtn");
const resultsContainer = document.getElementById("results");
const statusEl = document.getElementById("status");
const mapCountriesLayer = document.getElementById("mapCountries");

let allFaculty = [];
const selectedDepartments = new Set();
let allCountries = [];

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
  renderWorldMap(allCountries, new Set(), new Set(allCountries));
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

function renderWorldMap(countries, selectedCountries, availableCountries) {
  if (!mapCountriesLayer) {
    return;
  }

  mapCountriesLayer.innerHTML = "";

  countries.forEach((country) => {
    const [x, y] = projectCountry(country);
    const isAvailable = availableCountries.has(country);
    const isSelected = selectedCountries.has(country);

    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("cx", String(x));
    marker.setAttribute("cy", String(y));
    marker.setAttribute("r", "6");
    marker.setAttribute(
      "class",
      `map-country ${isAvailable ? "available" : "unavailable"} ${isSelected ? "selected" : ""}`.trim()
    );
    marker.setAttribute("aria-label", country);

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = country;
    marker.appendChild(title);

    if (isAvailable) {
      marker.addEventListener("click", () => {
        toggleCountrySelection(country);
      });
    }

    mapCountriesLayer.appendChild(marker);
  });
}

function projectCountry(country) {
  const coordinates = COUNTRY_COORDINATES[country] || fallbackCoordinates(country);
  const [longitude, latitude] = coordinates;
  const x = ((longitude + 180) / 360) * 1000;
  const y = ((90 - latitude) / 180) * 500;
  return [Math.max(8, Math.min(992, x)), Math.max(8, Math.min(492, y))];
}

function fallbackCoordinates(country) {
  let hash = 0;
  for (let i = 0; i < country.length; i += 1) {
    hash = (hash * 31 + country.charCodeAt(i)) >>> 0;
  }
  const longitude = (hash % 320) - 160;
  const latitude = ((Math.floor(hash / 320) % 120) - 60) * 0.9;
  return [longitude, latitude];
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
  renderWorldMap(allCountries, selectedGeos, availableCountries);

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
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}