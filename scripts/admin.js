import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const $ = selector => document.querySelector(selector);
const loginPanel = $("[data-login-panel]");
const dashboard = $("[data-dashboard]");
const loginMessage = $("[data-login-message]");
const dashboardMessage = $("[data-dashboard-message]");
const editorRoot = $("[data-content-editors]");
const defaults = {
  site_settings: { community_name: "SCW Community Da Mecca", hero_title: "Welcome to Da Mecca SCW", hero_description: "Track rankings, championships, events, and every competitor in the best community.", footer: "SCW Community Tracker by MBA © BJZL 2026", accent: "#ffd700", background: "#2b0238" },
  champions: [{ title: "SCW Global Champion", name: "Vacant" }], rankings: [], roster: [], alumni: [], events: [], weekly_matches: [], rules: []
};
const editorDefinitions = {
  champions: { title: "Championships", help: "Add, remove, or rename championship cards whenever the title picture changes.", fields: [["title", "Championship title"], ["name", "Current champion"]] },
  rankings: { title: "Rankings", help: "Each competitor is a card. Add or remove them as the rankings change.", fields: [["name", "Competitor name"]] },
  roster: { title: "Roster", help: "Each new competitor gets a card on the public roster.", fields: [["name", "Competitor name"], ["description", "Optional description", true]] },
  alumni: { title: "Alumni", help: "Each alumnus gets a card. Keep their legacy details with them.", fields: [["name", "Name"], ["description", "Description", true]] },
  events: { title: "Events", help: "Every event is its own public card.", fields: [["title", "Event name"], ["description", "Description", true]] },
  weekly_matches: { title: "Weekly match cards", help: "Create as many match cards as the show needs. Competitors are comma-separated.", fields: [["label", "Match label"], ["title", "Match type"], ["competitors", "Competitors"], ["stipulation", "Optional stipulation", true]] },
  rules: { title: "Community rules", help: "Each rule has its own card, ready to change with the season.", fields: [["label", "Rule name"], ["description", "Description", true]] }
};
let supabase;
let content = structuredClone(defaults);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const message = (element, text, error = false) => { element.textContent = text; element.classList.toggle("error", error); };

function editorItems(key) {
  const items = content[key] || [];
  return key === "rankings" ? items.map(item => typeof item === "string" ? { name: item } : item) : items.map(item => ({ ...item, competitors: Array.isArray(item.competitors) ? item.competitors.join(", ") : item.competitors || "" }));
}
function renderContentEditors() {
  editorRoot.innerHTML = Object.entries(editorDefinitions).map(([key, definition]) => {
    const cards = editorItems(key).map((item, index) => `<article class="content-card"><p class="content-card__number">Card ${index + 1}</p>${definition.fields.map(([field, label, long]) => `<label>${label}${long ? `<textarea rows="3" data-content-field="${field}" data-content-key="${key}" data-content-index="${index}">${escapeHtml(item[field])}</textarea>` : `<input data-content-field="${field}" data-content-key="${key}" data-content-index="${index}" value="${escapeHtml(item[field])}">`}</label>`).join("")}<button class="remove-card" type="button" data-remove-content="${key}" data-content-index="${index}">Remove card</button></article>`).join("") || `<p class="help">No cards yet. Add the first one whenever you are ready.</p>`;
    return `<section class="editor-card"><h2>${definition.title}</h2><p class="help">${definition.help}</p><div class="content-card-grid">${cards}</div><div class="section-actions"><button type="button" class="button-secondary" data-add-content="${key}">Add new card</button><button type="button" data-save-content="${key}">Save ${definition.title}</button></div></section>`;
  }).join("");
}
function updateItem(key, index, field, value) {
  const items = editorItems(key);
  items[index][field] = value;
  content[key] = items;
}
function serializeContent(key) {
  const items = editorItems(key);
  if (key === "rankings") return items.map(item => item.name.trim()).filter(Boolean);
  if (key === "champions") return items.filter(item => item.title?.trim()).map((item, index) => ({ title: item.title.trim(), name: item.name?.trim() || "Vacant", featured: index === 0 }));
  if (key === "weekly_matches") return items.filter(item => item.label?.trim() || item.title?.trim()).map((item, index) => ({ label: item.label?.trim() || "Match", title: item.title?.trim() || "", competitors: String(item.competitors || "").split(",").map(name => name.trim()).filter(Boolean), stipulation: item.stipulation?.trim() || "", main_event: index === items.length - 1 }));
  return items.filter(item => Object.values(item).some(value => String(value).trim())).map(item => ({ ...item }));
}
async function save(key, value) {
  const { error } = await supabase.from("site_content").upsert({ content_key: key, content_value: value, updated_at: new Date().toISOString() });
  if (error) throw error;
  content[key] = value;
}
function fillSettings() {
  const settings = content.site_settings || defaults.site_settings;
  Object.entries(settings).forEach(([key, value]) => { const input = $(`[data-settings-form] [name='${key}']`); if (input) input.value = value; });
}
async function loadDashboard() {
  const [{ data: rows, error }, { data: factions, error: factionsError }] = await Promise.all([supabase.from("site_content").select("content_key, content_value"), supabase.from("factions").select("id, name, image_url, sort_order").order("sort_order")]);
  if (error || factionsError) throw error || factionsError;
  content = structuredClone(defaults);
  rows.forEach(row => { content[row.content_key] = row.content_value; });
  fillSettings();
  renderContentEditors();
  renderFactions(factions);
}
function renderFactions(items) { $("[data-faction-list]").innerHTML = items.length ? items.map(item => `<article class="faction-admin-card"><img src="${escapeHtml(item.image_url)}" alt=""><strong>${escapeHtml(item.name)}</strong><button type="button" data-delete-faction="${item.id}">Remove</button></article>`).join("") : "<p class='help'>No factions added yet.</p>"; }
async function verifyLeader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (error || !profile || !["leader", "admin"].includes(profile.role)) { await supabase.auth.signOut(); message(loginMessage, "This account is not approved as an SCW leader yet.", true); return false; }
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await loadDashboard();
  return true;
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) message(loginMessage, "Dashboard setup is not complete yet. Add the Supabase public URL and anon key in scripts/supabase-config.js.", true);
else { supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); verifyLeader().catch(error => message(loginMessage, error.message, true)); }

$("[data-login-form]").addEventListener("submit", async event => { event.preventDefault(); if (!supabase) return; const form = new FormData(event.currentTarget); message(loginMessage, "Signing in…"); const { error } = await supabase.auth.signInWithPassword({ email: form.get("email"), password: form.get("password") }); if (error) return message(loginMessage, error.message, true); try { await verifyLeader(); } catch (loadError) { message(loginMessage, loadError.message, true); } });
$("[data-signout]").addEventListener("click", async () => { await supabase.auth.signOut(); dashboard.hidden = true; loginPanel.hidden = false; message(loginMessage, "Signed out."); });
$("[data-settings-form]").addEventListener("submit", async event => { event.preventDefault(); try { await save("site_settings", Object.fromEntries(new FormData(event.currentTarget))); message(dashboardMessage, "Site settings saved."); } catch (error) { message(dashboardMessage, error.message, true); } });
$("[data-site-images-form]").addEventListener("submit", async event => { event.preventDefault(); const form = new FormData(event.currentTarget), image = form.get("image"), kind = form.get("kind"); if (!image?.size) return; const safeName = image.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-"); const path = `site/${Date.now()}-${safeName}`; try { message(dashboardMessage, "Uploading site image…"); const { error: uploadError } = await supabase.storage.from("scw-images").upload(path, image, { upsert: false }); if (uploadError) throw uploadError; const { data: urlData } = supabase.storage.from("scw-images").getPublicUrl(path); await save("site_settings", { ...(content.site_settings || defaults.site_settings), [kind]: urlData.publicUrl }); event.currentTarget.reset(); message(dashboardMessage, "Site image saved."); } catch (error) { message(dashboardMessage, error.message, true); } });
editorRoot.addEventListener("input", event => { const field = event.target.dataset.contentField; if (field) updateItem(event.target.dataset.contentKey, Number(event.target.dataset.contentIndex), field, event.target.value); });
editorRoot.addEventListener("click", async event => {
  const key = event.target.dataset.addContent || event.target.dataset.removeContent || event.target.dataset.saveContent;
  if (!key) return;
  if (event.target.dataset.addContent) { content[key] = [...editorItems(key), {}]; renderContentEditors(); return; }
  if (event.target.dataset.removeContent) { content[key] = editorItems(key).filter((_, index) => index !== Number(event.target.dataset.contentIndex)); renderContentEditors(); return; }
  try { await save(key, serializeContent(key)); renderContentEditors(); message(dashboardMessage, `${editorDefinitions[key].title} saved.`); } catch (error) { message(dashboardMessage, error.message, true); }
});
$("[data-faction-form]").addEventListener("submit", async event => { event.preventDefault(); const form = new FormData(event.currentTarget), image = form.get("image"); if (!image?.size) return; const safeName = image.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-"); const path = `factions/${Date.now()}-${safeName}`; try { message(dashboardMessage, "Uploading faction logo…"); const { error: uploadError } = await supabase.storage.from("scw-images").upload(path, image, { upsert: false }); if (uploadError) throw uploadError; const { data: urlData } = supabase.storage.from("scw-images").getPublicUrl(path); const { error } = await supabase.from("factions").insert({ name: form.get("name"), image_url: urlData.publicUrl }); if (error) throw error; event.currentTarget.reset(); await loadDashboard(); message(dashboardMessage, "Faction added."); } catch (error) { message(dashboardMessage, error.message, true); } });
$("[data-faction-list]").addEventListener("click", async event => { const id = event.target.dataset.deleteFaction; if (!id || !confirm("Remove this faction from the site?")) return; try { const { error } = await supabase.from("factions").delete().eq("id", id); if (error) throw error; await loadDashboard(); message(dashboardMessage, "Faction removed."); } catch (error) { message(dashboardMessage, error.message, true); } });
