const CSV_FILE = "CODEX TEST - Faculty List.csv";

const departmentFilter = document.getElementById("departmentFilter");
const geoFilter = document.getElementById("geoFilter");
const clearBtn = document.getElementById("clearBtn");
const resultsContainer = document.getElementById("results");
const statusEl = document.getElementById("status");

let allFaculty = [];
const selectedDepartments = new Set();

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
  const geos = uniqueSorted(facultyList.flatMap((f) => f.countries));

  addDepartmentButtons(departments);
  addOptions(geoFilter, geos);
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
  const selectedGeos = getSelectedValues(geoFilter);

  const filtered = allFaculty.filter((person) => {
    const departmentPasses =
      selectedDepartments.size === 0 || selectedDepartments.has(person.department);

    const geoPasses =
      selectedGeos.size === 0 ||
      person.countries.some((token) => selectedGeos.has(token));

    return departmentPasses && geoPasses;
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
