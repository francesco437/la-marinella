const form = document.getElementById("bookingForm");
const customerNameInput = document.getElementById("customerName");
const bookingDateInput = document.getElementById("bookingDate");
const durationInput = document.getElementById("duration");
const selectedUmbrellaInput = document.getElementById("selectedUmbrella");
const loungersInput = document.getElementById("loungers");
const notesInput = document.getElementById("notes");
const bookingTotal = document.getElementById("bookingTotal");
const summaryText = document.getElementById("summaryText");
const availableUmbrellas = document.getElementById("availableUmbrellas");
const selectedSpotLabel = document.getElementById("selectedSpotLabel");

const STORAGE_KEY = "la-marinella-client-bookings";
const UMBRELLAS = ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6", "C1", "C2", "C3", "C4", "C5", "C6"];
const PRICES = {
  full: { umbrella: 25, lounger: 12 },
  half: { umbrella: 18, lounger: 6 },
};

let bookings = loadBookings();
let selectedUmbrella = "";

setDefaultDate();
renderUmbrellaMap();
updateSummary();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const booking = {
    id: crypto.randomUUID(),
    customerName: customerNameInput.value.trim(),
    date: bookingDateInput.value,
    duration: durationInput.value,
    umbrella: selectedUmbrella,
    loungers: Number(loungersInput.value),
    notes: notesInput.value.trim(),
  };

  const validationError = validateBooking(booking);
  if (validationError) {
    window.alert(validationError);
    return;
  }

  booking.total = calculateTotal(booking.duration, booking.loungers);
  bookings.unshift(booking);
  saveBookings();
  form.reset();
  selectedUmbrella = "";
  setDefaultDate();
  durationInput.value = "full";
  loungersInput.value = 2;
  selectedUmbrellaInput.value = "";
  selectedSpotLabel.textContent = "Nessuno";
  updateSummary();
  renderUmbrellaMap();
  window.alert("Richiesta inviata. La Marinella ti ricontattera per la conferma.");
});

[bookingDateInput, durationInput, loungersInput].forEach((input) => {
  input.addEventListener("input", () => {
    updateSummary();
    if (input === bookingDateInput) {
      clearSelectionIfBooked();
      renderUmbrellaMap();
    }
  });
});

function renderUmbrellaMap() {
  const rows = {
    A: document.getElementById("row1"),
    B: document.getElementById("row2"),
    C: document.getElementById("row3"),
  };

  Object.values(rows).forEach((row) => {
    row.innerHTML = "";
  });

  const bookedForDate = new Set(
    bookings
      .filter((booking) => booking.date === bookingDateInput.value)
      .map((booking) => booking.umbrella)
  );

  UMBRELLAS.forEach((code) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "umbrella-seat";
    button.textContent = code;

    if (bookedForDate.has(code)) {
      button.classList.add("booked");
      button.disabled = true;
    } else if (selectedUmbrella === code) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      selectedUmbrella = code;
      selectedUmbrellaInput.value = code;
      selectedSpotLabel.textContent = code;
      renderUmbrellaMap();
      updateSummary();
    });

    rows[code.charAt(0)].appendChild(button);
  });

  availableUmbrellas.textContent = String(UMBRELLAS.length - bookedForDate.size);
}

function validateBooking(booking) {
  if (!booking.customerName) {
    return "Inserisci il nome.";
  }

  if (!booking.date) {
    return "Seleziona una data.";
  }

  if (!booking.umbrella) {
    return "Seleziona un ombrellone dalla mappa.";
  }

  if (!PRICES[booking.duration]) {
    return "Seleziona una fascia valida.";
  }

  if (booking.loungers < 0 || booking.loungers > 4) {
    return "Puoi scegliere da 0 a 4 sdraio.";
  }

  const alreadyBooked = bookings.some(
    (item) => item.date === booking.date && item.umbrella === booking.umbrella
  );

  if (alreadyBooked) {
    return "Questo ombrellone risulta gia occupato per la data scelta.";
  }

  return null;
}

function calculateTotal(duration, loungers) {
  const prices = PRICES[duration];
  return prices.umbrella + loungers * prices.lounger;
}

function updateSummary() {
  const duration = durationInput.value;
  const loungers = Number(loungersInput.value) || 0;
  const total = calculateTotal(duration, loungers);
  const durationLabel = duration === "half" ? "mezza giornata" : "giornata intera";

  bookingTotal.textContent = formatCurrency(total);
  summaryText.textContent = `1 ombrellone, ${loungers} sdraio, ${durationLabel}`;
}

function clearSelectionIfBooked() {
  if (!selectedUmbrella) {
    return;
  }

  const alreadyBooked = bookings.some(
    (item) => item.date === bookingDateInput.value && item.umbrella === selectedUmbrella
  );

  if (alreadyBooked) {
    selectedUmbrella = "";
    selectedUmbrellaInput.value = "";
    selectedSpotLabel.textContent = "Nessuno";
  }
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
  } catch {
    return [];
  }
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
