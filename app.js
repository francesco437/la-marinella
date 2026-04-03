const form = document.getElementById("bookingForm");
const customerNameInput = document.getElementById("customerName");
const bookingDateInput = document.getElementById("bookingDate");
const rowSelect = document.getElementById("rowSelect");
const umbrellasInput = document.getElementById("umbrellas");
const loungersInput = document.getElementById("loungers");
const notesInput = document.getElementById("notes");
const bookingTotal = document.getElementById("bookingTotal");
const bookingList = document.getElementById("bookingList");
const emptyState = document.getElementById("emptyState");
const availableUmbrellas = document.getElementById("availableUmbrellas");
const availableLoungers = document.getElementById("availableLoungers");

const PRICES = {
  umbrella: 18,
  lounger: 7,
};

const STOCK = {
  umbrellas: 24,
  loungers: 60,
};

const STORAGE_KEY = "beach-booking-app-bookings";

let bookings = loadBookings();

setDefaultDate();
updateTotal();
renderBookings();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const booking = {
    id: crypto.randomUUID(),
    customerName: customerNameInput.value.trim(),
    date: bookingDateInput.value,
    row: rowSelect.value,
    umbrellas: Number(umbrellasInput.value),
    loungers: Number(loungersInput.value),
    notes: notesInput.value.trim(),
  };

  const validationError = validateBooking(booking);
  if (validationError) {
    window.alert(validationError);
    return;
  }

  booking.total = calculateTotal(booking.umbrellas, booking.loungers);
  bookings.unshift(booking);
  saveBookings();
  renderBookings();
  form.reset();
  setDefaultDate();
  rowSelect.value = "Fila 2";
  umbrellasInput.value = 1;
  loungersInput.value = 2;
  updateTotal();
});

[umbrellasInput, loungersInput].forEach((input) => {
  input.addEventListener("input", updateTotal);
});

bookingList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const bookingId = target.dataset.bookingId;
  if (!bookingId) {
    return;
  }

  bookings = bookings.filter((booking) => booking.id !== bookingId);
  saveBookings();
  renderBookings();
});

function calculateTotal(umbrellas, loungers) {
  return umbrellas * PRICES.umbrella + loungers * PRICES.lounger;
}

function updateTotal() {
  const umbrellas = Number(umbrellasInput.value) || 0;
  const loungers = Number(loungersInput.value) || 0;
  const total = calculateTotal(umbrellas, loungers);
  bookingTotal.textContent = formatCurrency(total);
}

function validateBooking(booking) {
  if (!booking.customerName) {
    return "Inserisci il nome del cliente.";
  }

  if (!booking.date) {
    return "Seleziona una data.";
  }

  if (!booking.row) {
    return "Seleziona una fila.";
  }

  if (booking.umbrellas < 1 || booking.loungers < 1) {
    return "Serve almeno 1 ombrellone e 1 sdraio.";
  }

  const bookedForDate = bookings.filter((item) => item.date === booking.date);
  const usedUmbrellas = bookedForDate.reduce((sum, item) => sum + item.umbrellas, 0);
  const usedLoungers = bookedForDate.reduce((sum, item) => sum + item.loungers, 0);

  if (usedUmbrellas + booking.umbrellas > STOCK.umbrellas) {
    return "Non ci sono abbastanza ombrelloni disponibili per questa data.";
  }

  if (usedLoungers + booking.loungers > STOCK.loungers) {
    return "Non ci sono abbastanza sdraio disponibili per questa data.";
  }

  return null;
}

function renderBookings() {
  const sortedBookings = [...bookings].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.customerName.localeCompare(b.customerName);
  });

  bookingList.innerHTML = "";
  emptyState.style.display = sortedBookings.length ? "none" : "block";

  sortedBookings.forEach((booking) => {
    const item = document.createElement("article");
    item.className = "booking-item";
    item.innerHTML = `
      <div class="booking-item-header">
        <div class="booking-title">
          <h3>${escapeHtml(booking.customerName)}</h3>
          <span class="booking-row-badge">${escapeHtml(booking.row || "Fila non indicata")}</span>
          <span class="booking-total">${formatCurrency(booking.total)}</span>
        </div>
        <button class="delete-button" type="button" data-booking-id="${booking.id}">
          Elimina
        </button>
      </div>
      <div class="booking-meta">
        <span class="booking-date">${formatDate(booking.date)}</span>
        <span>${booking.umbrellas} ombrellone/i</span>
        <span>${booking.loungers} sdraio</span>
      </div>
      <p class="booking-notes">${booking.notes ? escapeHtml(booking.notes) : "Nessuna nota"}</p>
    `;
    bookingList.appendChild(item);
  });

  updateAvailability();
}

function updateAvailability() {
  const selectedDate = bookingDateInput.value;
  const bookedForDate = bookings.filter((booking) => booking.date === selectedDate);
  const usedUmbrellas = bookedForDate.reduce((sum, item) => sum + item.umbrellas, 0);
  const usedLoungers = bookedForDate.reduce((sum, item) => sum + item.loungers, 0);

  availableUmbrellas.textContent = String(STOCK.umbrellas - usedUmbrellas);
  availableLoungers.textContent = String(STOCK.loungers - usedLoungers);
}

bookingDateInput.addEventListener("input", updateAvailability);

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

function setDefaultDate() {
  if (!bookingDateInput.value) {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
    const today = localDate;
    bookingDateInput.value = today;
  }
  updateAvailability();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
