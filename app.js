// ─── Costanti ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "la-marinella-client-bookings";

// 6 ombrelloni per fila, 3 file (A, B, C)
const UMBRELLAS = ["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5","B6","C1","C2","C3","C4","C5","C6"];
const MAX_LOUNGERS = 4;

const PRICES = {
  full: { umbrella: 25, lounger: 12 },
  half: { umbrella: 18, lounger: 6 },
};

// ─── Stato ──────────────────────────────────────────────────────────────────
let bookings = loadBookings();
let selectedUmbrella = "";       // es. "B3"
let selectedLoungers  = [];      // es. ["B3-L1", "B3-L2"]

// ─── DOM ────────────────────────────────────────────────────────────────────
const form                  = document.getElementById("bookingForm");
const customerNameInput     = document.getElementById("customerName");
const bookingDateInput      = document.getElementById("bookingDate");
const durationInput         = document.getElementById("duration");
const selectedUmbrellaInput = document.getElementById("selectedUmbrella");
const selectedLoungersDisplay = document.getElementById("selectedLoungersDisplay");
const notesInput            = document.getElementById("notes");
const bookingTotal          = document.getElementById("bookingTotal");
const summaryText           = document.getElementById("summaryText");
const availableUmbrellas    = document.getElementById("availableUmbrellas");
const selectedSpotLabel     = document.getElementById("selectedSpotLabel");
const selectedLoungersLabel = document.getElementById("selectedLoungersLabel");
const liveTotalLabel        = document.getElementById("liveTotalLabel");
const loungerPicker         = document.getElementById("loungerPicker");
const loungerGrid           = document.getElementById("loungerGrid");
const pickerUmbrellaName    = document.getElementById("pickerUmbrellaName");

// ─── Init ────────────────────────────────────────────────────────────────────
setDefaultDate();
renderUmbrellaMap();
updateSummary();

// ─── Event listeners ─────────────────────────────────────────────────────────
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const booking = {
    id:           crypto.randomUUID(),
    customerName: customerNameInput.value.trim(),
    date:         bookingDateInput.value,
    duration:     durationInput.value,
    umbrella:     selectedUmbrella,
    loungers:     selectedLoungers.length,
    loungerCodes: [...selectedLoungers],
    notes:        notesInput.value.trim(),
  };

  const err = validateBooking(booking);
  if (err) { window.alert(err); return; }

  booking.total = calculateTotal(booking.duration, booking.loungers);
  bookings.unshift(booking);
  saveBookings();
  resetForm();
  window.alert("Richiesta inviata! La Marinella ti ricontatterà per la conferma.");
});

[bookingDateInput, durationInput].forEach((el) => {
  el.addEventListener("input", () => {
    if (el === bookingDateInput) {
      clearSelectionIfBooked();
      renderUmbrellaMap();
      if (selectedUmbrella) renderLoungerPicker();
    }
    updateSummary();
  });
});

// ─── Render mappa ombrelloni ─────────────────────────────────────────────────
function renderUmbrellaMap() {
  const rows = {
    A: document.getElementById("row1"),
    B: document.getElementById("row2"),
    C: document.getElementById("row3"),
  };
  Object.values(rows).forEach((r) => (r.innerHTML = ""));

  const bookedSet = getBookedUmbrellasForDate(bookingDateInput.value);

  UMBRELLAS.forEach((code) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "umbrella-seat";
    btn.textContent = code;

    if (bookedSet.has(code)) {
      btn.classList.add("booked");
      btn.disabled = true;
    } else if (selectedUmbrella === code) {
      btn.classList.add("selected");
    }

    btn.addEventListener("click", () => {
      if (selectedUmbrella === code) {
        // deseleziona
        selectedUmbrella = "";
        selectedLoungers = [];
        hideLoungerPicker();
      } else {
        selectedUmbrella = code;
        selectedLoungers = [];
        renderLoungerPicker();
      }
      syncFormFields();
      renderUmbrellaMap();
      updateSummary();
    });

    rows[code.charAt(0)].appendChild(btn);
  });

  availableUmbrellas.textContent = String(UMBRELLAS.length - bookedSet.size);
}

// ─── Render picker sdraio ────────────────────────────────────────────────────
function renderLoungerPicker() {
  pickerUmbrellaName.textContent = selectedUmbrella;
  loungerGrid.innerHTML = "";

  for (let i = 1; i <= MAX_LOUNGERS; i++) {
    const code = `${selectedUmbrella}-L${i}`;
    const btn  = document.createElement("button");
    btn.type   = "button";
    btn.className = "lounger-seat" + (selectedLoungers.includes(code) ? " selected" : "");

    btn.innerHTML = `<span class="lounger-icon">🪑</span><span>Sdraio ${i}</span>`;

    btn.addEventListener("click", () => {
      if (selectedLoungers.includes(code)) {
        selectedLoungers = selectedLoungers.filter((c) => c !== code);
      } else {
        selectedLoungers.push(code);
      }
      syncFormFields();
      renderLoungerPicker();
      updateSummary();
    });

    loungerGrid.appendChild(btn);
  }

  loungerPicker.style.display = "block";
}

function hideLoungerPicker() {
  loungerPicker.style.display = "none";
}

// ─── Sincronizza campi form nascosti ─────────────────────────────────────────
function syncFormFields() {
  selectedUmbrellaInput.value = selectedUmbrella || "";
  selectedLoungersDisplay.value = selectedLoungers.length
    ? `${selectedLoungers.length} sdraio (${selectedLoungers.map((c) => c.split("-")[1]).join(", ")})`
    : "";
}

// ─── Riepilogo prezzi ────────────────────────────────────────────────────────
function updateSummary() {
  const duration = durationInput.value;
  const n        = selectedLoungers.length;
  const total    = calculateTotal(duration, n);
  const durLabel = duration === "half" ? "mezza giornata" : "giornata intera";

  bookingTotal.textContent = formatCurrency(total);
  liveTotalLabel.textContent = formatCurrency(total);
  selectedSpotLabel.textContent = selectedUmbrella || "—";
  selectedLoungersLabel.textContent = String(n);

  if (selectedUmbrella) {
    summaryText.textContent = `Ombrellone ${selectedUmbrella}, ${n} sdraio, ${durLabel}`;
  } else {
    summaryText.textContent = "Seleziona ombrellone e sdraio dalla mappa";
  }
}

// ─── Validazione ─────────────────────────────────────────────────────────────
function validateBooking(b) {
  if (!b.customerName)    return "Inserisci il tuo nome.";
  if (!b.date)            return "Seleziona una data.";
  if (!b.umbrella)        return "Seleziona un ombrellone dalla mappa.";
  if (!PRICES[b.duration]) return "Seleziona una fascia oraria valida.";

  const alreadyBooked = bookings.some(
    (item) => item.date === b.date && item.umbrella === b.umbrella
  );
  if (alreadyBooked) return "Questo ombrellone è già occupato per la data scelta.";

  return null;
}

// ─── Calcolo totale ──────────────────────────────────────────────────────────
function calculateTotal(duration, loungerCount) {
  const p = PRICES[duration];
  return p.umbrella + loungerCount * p.lounger;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getBookedUmbrellasForDate(date) {
  return new Set(
    bookings.filter((b) => b.date === date).map((b) => b.umbrella)
  );
}

function clearSelectionIfBooked() {
  if (!selectedUmbrella) return;
  const booked = getBookedUmbrellasForDate(bookingDateInput.value);
  if (booked.has(selectedUmbrella)) {
    selectedUmbrella = "";
    selectedLoungers = [];
    hideLoungerPicker();
    syncFormFields();
  }
}

function resetForm() {
  form.reset();
  selectedUmbrella = "";
  selectedLoungers = [];
  setDefaultDate();
  durationInput.value = "full";
  hideLoungerPicker();
  syncFormFields();
  renderUmbrellaMap();
  updateSummary();
}

function setDefaultDate() {
  if (!bookingDateInput.value) {
    const now = new Date();
    bookingDateInput.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  }
}

function loadBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBookings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
