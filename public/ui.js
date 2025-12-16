const STORAGE_KEY = "wolfrun_entitlements";

function getEntitlements() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function setEntitlements(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

function refreshPremiumUI() {
  const ent = getEntitlements();
  const tag = document.getElementById("premiumTag");
  const buyBtn = document.getElementById("buyBtn");

  const premium = !!ent.premium;
  tag.style.display = premium ? "inline-flex" : "none";
  buyBtn.style.display = premium ? "none" : "inline-flex";
}

async function startCheckout() {
  const res = await fetch("/create-checkout-session", { method: "POST" });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
  else alert(data.error || "Checkout error");
}

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("wolfrun_best");
  localStorage.removeItem("wolfrun_totalbtc");
  window.location.reload();
}

document.getElementById("buyBtn").addEventListener("click", startCheckout);
document.getElementById("resetBtn").addEventListener("click", resetAll);

refreshPremiumUI();

// Expose for game.js
window.WolfRunUI = { getEntitlements, setEntitlements, refreshPremiumUI };
