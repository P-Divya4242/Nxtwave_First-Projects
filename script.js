const STORAGE_KEY = "spendwise_expenses_v1";
const SETTINGS_KEY = "spendwise_settings_v2";
const currencyMeta = {
  INR: { locale: "en-IN", symbol: "₹", name: "Indian Rupee" },
  USD: { locale: "en-US", symbol: "$", name: "US Dollar" },
  EUR: { locale: "de-DE", symbol: "€", name: "Euro" },
  GBP: { locale: "en-GB", symbol: "£", name: "British Pound" },
  JPY: { locale: "ja-JP", symbol: "¥", name: "Japanese Yen" },
  AED: { locale: "ar-AE", symbol: "د.إ", name: "UAE Dirham" },
  AUD: { locale: "en-AU", symbol: "A$", name: "Australian Dollar" },
  CAD: { locale: "en-CA", symbol: "C$", name: "Canadian Dollar" },
  SGD: { locale: "en-SG", symbol: "S$", name: "Singapore Dollar" }
};

const categories = {
  food: { name: "Food & Drinks", icon: "🍵", color: "#ef5732", bg: "#fde7e1" },
  transport: { name: "Transport", icon: "🚌", color: "#3280e9", bg: "#e4efff" },
  books: { name: "Books & Study", icon: "📚", color: "#8b55e8", bg: "#eee5ff" },
  entertainment: { name: "Entertainment", icon: "🎬", color: "#f09a00", bg: "#fff1d8" },
  health: { name: "Health", icon: "💚", color: "#2b9a70", bg: "#e2f6ed" },
  other: { name: "Other", icon: "●", color: "#77736c", bg: "#eeeae5" }
};

const seedExpenses = [
  { id: crypto.randomUUID(), amount: 500, description: "Book", category: "books", date: "2026-09-13", note: "" },
  { id: crypto.randomUUID(), amount: 85, description: "Canteen lunch", category: "food", date: "2026-09-13", note: "with classmates" },
  { id: crypto.randomUUID(), amount: 250, description: "Bus pass recharge", category: "transport", date: "2026-09-12", note: "" },
  { id: crypto.randomUUID(), amount: 450, description: "Data structures book", category: "books", date: "2026-09-11", note: "2nd hand" },
  { id: crypto.randomUUID(), amount: 180, description: "Movie night", category: "entertainment", date: "2026-09-10", note: "hostel friends" },
  { id: crypto.randomUUID(), amount: 40, description: "Chai & samosa", category: "food", date: "2026-09-13", note: "" }
];

let expenses = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || seedExpenses;
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {
  monthlyLimit: 0,
  tipsEnabled: true,
  currency: "INR"
};
settings.currency = currencyMeta[settings.currency] ? settings.currency : "INR";
let selectedYear = new Date().getFullYear();
let activeFilter = "all";
let toastTimer;

const $ = (id) => document.getElementById(id);
const expenseForm = $("expenseForm");

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function formatCurrency(value) {
  const currency = settings.currency || "INR";
  const meta = currencyMeta[currency];
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2
  }).format(Number(value) || 0);
}

function currencySymbol() {
  return currencyMeta[settings.currency]?.symbol || "₹";
}

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function prettyDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function renderCategoryChoices() {
  $("categoryChoices").innerHTML = Object.entries(categories).map(([key, cat]) => `
    <button type="button" class="category-choice" data-category="${key}"
      style="--cat-color:${cat.color}">
      ${cat.name}
    </button>
  `).join("");

  document.querySelectorAll(".category-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-choice").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      $("categoryError").textContent = "";
    });
  });
}

function selectedCategory() {
  return document.querySelector(".category-choice.selected")?.dataset.category || "";
}

function setCategory(category) {
  document.querySelectorAll(".category-choice").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.category === category);
  });
}

function renderFilters() {
  $("filters").innerHTML = [
    ["all", "All"],
    ...Object.entries(categories).map(([key, cat]) => [key, `${cat.icon} ${cat.name}`])
  ].map(([key, label]) => `
    <button class="filter ${activeFilter === key ? "active" : ""}" data-filter="${key}">${label}</button>
  `).join("");

  document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      renderFilters();
      renderExpenses();
    });
  });
}

function getVisibleExpenses() {
  const search = $("searchInput").value.trim().toLowerCase();
  const sort = $("sortSelect").value;

  let result = expenses.filter(item => {
    const matchesCategory = activeFilter === "all" || item.category === activeFilter;
    const matchesSearch = !search ||
      item.description.toLowerCase().includes(search) ||
      (item.note || "").toLowerCase().includes(search) ||
      categories[item.category].name.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  result.sort((a, b) => {
    if (sort === "oldest") return a.date.localeCompare(b.date);
    if (sort === "high") return b.amount - a.amount;
    if (sort === "low") return a.amount - b.amount;
    return b.date.localeCompare(a.date);
  });
  return result;
}

function renderExpenses() {
  const visible = getVisibleExpenses();
  $("shownCount").textContent = `${visible.length} SHOWN`;
  $("expenseList").innerHTML = visible.map(item => {
    const cat = categories[item.category];
    const note = item.note ? ` · ${escapeHtml(item.note)}` : "";
    return `
      <article class="expense-item">
        <div class="expense-icon" style="--cat-bg:${cat.bg}">${cat.icon}</div>
        <div class="expense-main">
          <h3>${escapeHtml(item.description)}</h3>
          <p class="expense-meta">${prettyDate(item.date)} · ${cat.name}${note}</p>
        </div>
        <strong class="expense-amount">${formatCurrency(item.amount)}</strong>
        <div class="item-actions">
          <button class="icon-btn edit-btn" data-id="${item.id}" title="Edit" aria-label="Edit expense">✎</button>
          <button class="icon-btn delete-btn" data-id="${item.id}" title="Delete" aria-label="Delete expense">×</button>
        </div>
      </article>
    `;
  }).join("");

  $("emptyState").classList.toggle("hidden", visible.length !== 0);

  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id));
  });
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteExpense(btn.dataset.id));
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function renderSummary() {
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const today = localDateString();
  const todayTotal = expenses
    .filter(item => item.date === today)
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const categoryTotals = {};
  expenses.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount);
  });

  const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  $("totalSpent").textContent = formatCurrency(total);
  $("expenseCount").textContent = `${expenses.length} expense${expenses.length === 1 ? "" : "s"} recorded`;
  $("todaySpent").textContent = formatCurrency(todayTotal);
  $("todayMessage").textContent = todayTotal ? "Spent today" : "Nothing yet today";
  $("topCategory").textContent = top ? `${categories[top[0]].icon} ${categories[top[0]].name}` : "—";
  $("topCategoryAmount").textContent = top ? `${formatCurrency(top[1])} so far` : `${formatCurrency(0)} so far`;
  $("formCurrencySymbol").textContent = currencySymbol();
  $("settingsCurrencySymbol").textContent = currencySymbol();
}

function renderCategoryBars() {
  const totals = {};
  expenses.forEach(item => {
    totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
  });

  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  const active = Object.keys(totals).filter(key => totals[key] > 0).length;
  $("activeCategoryCount").textContent = `${active} ACTIVE`;

  $("categoryBars").innerHTML = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([key, amount]) => {
      const cat = categories[key];
      const percentage = total ? (amount / total) * 100 : 0;
      return `
        <div class="category-bar-row">
          <div class="bar-head">
            <span class="category-name">${cat.icon} ${cat.name}</span>
            <span class="category-value">${formatCurrency(amount)} · ${Math.round(percentage)}%</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="--cat-color:${cat.color};width:${percentage}%"></div></div>
        </div>
      `;
    }).join("") || `<p class="privacy-note">Your category breakdown will appear here.</p>`;
}

function renderLimitCard() {
  const limit = Number(settings.monthlyLimit) || 0;
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const spent = expenses
    .filter(item => item.date.startsWith(monthPrefix))
    .reduce((sum, item) => sum + Number(item.amount), 0);

  $("monthlyLimit").value = limit || "";
  $("currencySelect").value = settings.currency;
  $("formCurrencySymbol").textContent = currencySymbol();
  $("settingsCurrencySymbol").textContent = currencySymbol();
  $("tipsToggle").classList.toggle("on", settings.tipsEnabled);
  $("tipsToggle").setAttribute("aria-checked", String(settings.tipsEnabled));

  if (!limit) {
    $("limitStatus").textContent = "NOT SET";
    $("limitTitle").textContent = "Set your limit";
    $("limitDescription").textContent = "Add a monthly maximum to see how much room you have left.";
    $("limitProgress").style.width = "0%";
    $("limitSpent").textContent = `${formatCurrency(spent)} SPENT`;
    $("limitRemaining").textContent = "NO LIMIT";
    return;
  }

  const percentage = Math.min((spent / limit) * 100, 100);
  const remaining = limit - spent;
  $("limitStatus").textContent = `${Math.round(percentage)}% USED`;
  $("limitTitle").textContent = remaining >= 0 ? `${formatCurrency(remaining)} left` : "Over your limit";
  $("limitDescription").textContent =
    remaining >= 0 ? `You have ${formatCurrency(remaining)} remaining this month.` :
    `You are ${formatCurrency(Math.abs(remaining))} over your monthly limit.`;
  $("limitProgress").style.width = `${percentage}%`;
  $("limitSpent").textContent = `${formatCurrency(spent)} SPENT`;
  $("limitRemaining").textContent = formatCurrency(limit);
}


function getYearTotals(year) {
  const totals = Array(12).fill(0);
  expenses.forEach(item => {
    const date = new Date(`${item.date}T00:00:00`);
    if (date.getFullYear() === year) totals[date.getMonth()] += Number(item.amount);
  });
  return totals;
}

function renderAnnualView() {
  const totals = getYearTotals(selectedYear);
  const yearTotal = totals.reduce((a, b) => a + b, 0);
  const activeMonths = totals.filter(v => v > 0).length;
  const average = activeMonths ? yearTotal / activeMonths : 0;
  const highest = Math.max(...totals);
  const highestIndex = highest > 0 ? totals.indexOf(highest) : -1;
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(selectedYear, i, 1).toLocaleDateString("en-US", { month: "short" })
  );

  $("yearTotal").textContent = formatCurrency(yearTotal);
  $("yearAverage").textContent = formatCurrency(average);
  $("yearLabel").textContent = `${selectedYear} expenses`;
  $("highestMonth").textContent = highestIndex >= 0 ? monthNames[highestIndex] : "—";
  $("highestMonthAmount").textContent = highestIndex >= 0 ? formatCurrency(highest) : formatCurrency(0);
  $("annualYearTitle").textContent = selectedYear;
  $("selectedYearLabel").textContent = selectedYear;

  const max = Math.max(...totals, 1);
  $("monthlyGrid").innerHTML = totals.map((amount, index) => {
    const height = amount ? Math.max((amount / max) * 100, 7) : 0;
    return `
      <div class="month-card ${amount ? "has-spend" : ""}">
        <div class="month-card-head">
          <strong>${monthNames[index]}</strong>
          <span>${formatCurrency(amount)}</span>
        </div>
        <div class="month-bar-track">
          <span class="month-bar" style="height:${height}%"></span>
        </div>
        <small>${amount ? "Recorded" : "No spending"}</small>
      </div>
    `;
  }).join("");
}

function renderAll() {
  renderSummary();
  renderCategoryBars();
  renderExpenses();
  renderLimitCard();
  renderAnnualView();
}

function clearErrors() {
  $("amountError").textContent = "";
  $("descriptionError").textContent = "";
  $("categoryError").textContent = "";
}

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();

  const amount = Number($("amount").value);
  const description = $("description").value.trim();
  const category = selectedCategory();
  const date = $("date").value;
  const note = $("note").value.trim();
  let valid = true;

  if (!amount || amount <= 0) {
    $("amountError").textContent = "Enter an amount greater than ₹0.";
    valid = false;
  }
  if (!description) {
    $("descriptionError").textContent = "Please describe the expense.";
    valid = false;
  }
  if (!category) {
    $("categoryError").textContent = "Choose a category.";
    valid = false;
  }
  if (!date) valid = false;
  if (!valid) return;

  const editingId = $("editingId").value;
  const record = { id: editingId || crypto.randomUUID(), amount, description, category, date, note };

  if (editingId) {
    expenses = expenses.map(item => item.id === editingId ? record : item);
    showToast("Expense updated successfully.");
  } else {
    expenses.push(record);
    showToast("Expense added successfully.");
  }

  saveExpenses();
  resetForm();
  renderAll();
});

function resetForm() {
  expenseForm.reset();
  $("editingId").value = "";
  $("formTitle").textContent = "Record a new expense";
  $("submitBtn").textContent = "Add expense";
  $("cancelEditBtn").classList.add("hidden");
  setCategory("");
  $("date").value = localDateString();
  clearErrors();
}

function startEdit(id) {
  const item = expenses.find(expense => expense.id === id);
  if (!item) return;

  $("editingId").value = item.id;
  $("amount").value = item.amount;
  $("description").value = item.description;
  $("date").value = item.date;
  $("note").value = item.note || "";
  setCategory(item.category);
  $("formTitle").textContent = "Edit expense";
  $("submitBtn").textContent = "Save changes";
  $("cancelEditBtn").classList.remove("hidden");
  document.querySelector(".form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteExpense(id) {
  const item = expenses.find(expense => expense.id === id);
  if (!item) return;
  if (!confirm(`Delete "${item.description}"?`)) return;

  expenses = expenses.filter(expense => expense.id !== id);
  saveExpenses();
  renderAll();
  showToast("Expense deleted.");
}

$("cancelEditBtn").addEventListener("click", resetForm);

$("searchInput").addEventListener("input", renderExpenses);
$("sortSelect").addEventListener("change", renderExpenses);

$("clearAllBtn").addEventListener("click", () => {
  if (!expenses.length) {
    showToast("There are no expenses to clear.");
    return;
  }
  if (!confirm("Clear every saved expense from this browser? This cannot be undone.")) return;
  expenses = [];
  saveExpenses();
  resetForm();
  renderAll();
  showToast("All expenses cleared.");
});

$("currencySelect").addEventListener("change", () => {
  settings.currency = $("currencySelect").value;
  $("formCurrencySymbol").textContent = currencySymbol();
  $("settingsCurrencySymbol").textContent = currencySymbol();
  renderAll();
});

$("tipsToggle").addEventListener("click", () => {
  settings.tipsEnabled = !settings.tipsEnabled;
  renderLimitCard();
});

$("saveSettingsBtn").addEventListener("click", () => {
  const value = Number($("monthlyLimit").value);
  settings.currency = $("currencySelect").value;
  if (value < 0) {
    showToast("Monthly limit cannot be negative.");
    return;
  }
  settings.monthlyLimit = value || 0;
  saveSettings();
  renderLimitCard();
  $("settingsFeedback").textContent = "Settings saved locally.";
  showToast("Settings saved.");
  setTimeout(() => $("settingsFeedback").textContent = "", 2500);
});





$("prevYearBtn").addEventListener("click", () => {
  selectedYear -= 1;
  renderAnnualView();
});

$("nextYearBtn").addEventListener("click", () => {
  selectedYear += 1;
  renderAnnualView();
});

$("contactForm").addEventListener("submit", (event) => {
  event.preventDefault();
  $("contactNameError").textContent = "";
  $("contactEmailError").textContent = "";
  $("contactMessageError").textContent = "";
  $("contactFeedback").textContent = "";

  const name = $("contactName").value.trim();
  const email = $("contactEmail").value.trim();
  const message = $("contactMessage").value.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  let valid = true;

  if (!name) {
    $("contactNameError").textContent = "Please enter your name.";
    valid = false;
  }
  if (!emailOk) {
    $("contactEmailError").textContent = "Enter a valid email address.";
    valid = false;
  }
  if (!message) {
    $("contactMessageError").textContent = "Please enter a message.";
    valid = false;
  }
  if (!valid) return;

  $("contactFeedback").textContent = "Your message looks good. Demo mode does not send it anywhere.";
  showToast("Message checked successfully.");
});


$("menuBtn").addEventListener("click", () => {
  const nav = document.querySelector(".nav-links");
  const open = $("menuBtn").getAttribute("aria-expanded") === "true";
  $("menuBtn").setAttribute("aria-expanded", String(!open));
  nav.style.display = open ? "" : "flex";
  if (!open) {
    nav.style.position = "absolute";
    nav.style.top = "70px";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.padding = "18px 20px";
    nav.style.background = "var(--bg)";
    nav.style.borderBottom = "1px solid var(--line)";
    nav.style.flexDirection = "column";
  }
});

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 760) {
      document.querySelector(".nav-links").style.display = "";
      $("menuBtn").setAttribute("aria-expanded", "false");
    }
  });
});

$("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "short", day: "2-digit", month: "short", year: "numeric"
}).toUpperCase();

renderCategoryChoices();
renderFilters();
resetForm();
renderAll();
