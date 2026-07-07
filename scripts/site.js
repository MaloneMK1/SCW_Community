import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const fallback = {
  site_settings: { community_name: "SCW Community Da Mecca", hero_title: "Welcome to Da Mecca SCW", hero_description: "Track rankings, championships, events, and every competitor in the best community.", footer: "SCW Community Tracker by MBA © BJZL 2026", accent: "#ffd700", background: "#2b0238" },
  champions: [{ title: "SCW Global Champion", name: "Vacant", featured: true }, { title: "Five Star Champion", name: "Vacant" }, { title: "Tag Team Champions", name: "Vacant" }, { title: "Junkyard Dawg Champion", name: "Vacant" }, { title: "Rising Sun Champion", name: "Vacant" }],
  rankings: ["BJizzle AKA Termination", "Dillon", "Michael King", "Geez Profit", "Mica", "Pechuer", "Dwarven", "Phase", "DukeMane", "A Dub", "Final Rulez", "Jokey", "MPJRAR", "Redemption", "Story", "Kelly James", "Vegeta"],
  roster: [],
  alumni: [{ name: "BJizzle", description: "Owner • Former Champion • Community Veteran" }, { name: "RageMonkey", description: "Former Grand Slam Champion • Hall of Fame Competitor" }, { name: "FutureBound", description: "Former Grand Slam Champion • Hall of Fame Competitor" }, { name: "Sir Henry Francis", description: "Former Grand Slam Champion • Hall of Fame Competitor" }],
  events: [{ title: "SCW Weekly Showdown", description: "Rivalries continue as the road to the next championship event begins." }],
  weekly_matches: [{ label: "Number 1 Contenders Match", title: "Triple Threat Match", competitors: ["Competitor One", "Competitor Two", "Competitor Three"] }, { label: "Junkyard Dawg Title Match", title: "Backstage Street Fight", competitors: ["Competitor One", "Competitor Two"] }, { label: "SCW Global Championship Match", title: "Normal 1 vs 1 Match", competitors: ["Competitor One", "Competitor Two"], main_event: true }],
  rules: [{ label: "No Spamming", description: "Refrain from spamming strong strikes, repeated moves, or repeated combos." }, { label: "Ground Moves", description: "When your opponent is down, only two ground moves are permitted." }, { label: "No Exploits", description: "Broken moves, tactics, or game exploits may result in disqualification or removal after review." }, { label: "Pins", description: "Pins are only allowed after Signature or Finisher moves." }]
};

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const node = selector => document.querySelector(selector);

function render(data, factions = []) {
  const settings = data.site_settings || fallback.site_settings;
  document.documentElement.style.setProperty("--accent", settings.accent || fallback.site_settings.accent);
  document.documentElement.style.setProperty("--background", settings.background || fallback.site_settings.background);
  if (settings.background_image_url) document.documentElement.style.setProperty("--site-background-image", `url("${settings.background_image_url}")`);
  if (settings.header_background_url) document.documentElement.style.setProperty("--header-background-image", `url("${settings.header_background_url}")`);
  if (settings.logo_url) node("[data-site-logo]").src = settings.logo_url;
  document.title = settings.community_name || fallback.site_settings.community_name;
  node("[data-community-name]").textContent = settings.community_name || fallback.site_settings.community_name;
  node("[data-hero-title]").textContent = settings.hero_title || fallback.site_settings.hero_title;
  node("[data-hero-description]").textContent = settings.hero_description || fallback.site_settings.hero_description;
  node("[data-footer]").textContent = settings.footer || fallback.site_settings.footer;
  node("[data-champions]").innerHTML = (data.champions || []).map((item, index) => `<article class="champions__card ${item.featured ? "champions__card_global" : "champions__card_circle"}"><div class="champions__card-content"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.name)}</p></div></article>${index === 0 ? "" : ""}`).join("");
  node("[data-rankings]").innerHTML = (data.rankings || []).map(item => `<li>${escapeHtml(item)}</li>`).join("");
  node("[data-roster]").innerHTML = (data.roster || []).length ? data.roster.map(item => `<article class="roster__card"><h3 class="roster__name">${escapeHtml(item.name)}</h3>${item.description ? `<p class="roster__description">${escapeHtml(item.description)}</p>` : ""}</article>`).join("") : '<p class="roster__empty">New SCW competitors will appear here.</p>';
  node("[data-factions]").innerHTML = factions.length ? factions.map(item => `<article class="factions__card"><img class="factions__image" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)} logo"><h3 class="factions__name">${escapeHtml(item.name)}</h3></article>`).join("") : '<p class="factions__empty">Faction logos will appear here.</p>';
  node("[data-alumni]").innerHTML = (data.alumni || []).map(item => `<article class="alumni__card"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("");
  node("[data-events]").innerHTML = (data.events || []).map(item => `<article class="events__card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("");
  node("[data-matches]").innerHTML = (data.weekly_matches || []).map(item => `<article class="weekly-matches__card ${item.main_event ? "weekly-matches__card_main-event" : ""}"><p class="weekly-matches__label">${escapeHtml(item.label)}</p><h3 class="weekly-matches__title">${escapeHtml(item.title)}</h3>${item.stipulation ? `<p class="weekly-matches__stipulation">${escapeHtml(item.stipulation)}</p>` : ""}<ul class="weekly-matches__competitors">${(item.competitors || []).map(person => `<li>${escapeHtml(person)}</li>`).join("")}</ul></article>`).join("");
  node("[data-rules]").innerHTML = (data.rules || []).map(item => `<li class="rules__item"><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.description)}</li>`).join("");
}

async function load() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return render(fallback);
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const [{ data: contentRows, error: contentError }, { data: factions, error: factionsError }] = await Promise.all([supabase.from("site_content").select("content_key, content_value"), supabase.from("factions").select("name, image_url, sort_order").order("sort_order")]);
    if (contentError || factionsError) { console.warn("Could not load SCW content", contentError || factionsError); return render(fallback); }
    const content = { ...fallback };
    contentRows.forEach(row => { content[row.content_key] = row.content_value; });
    render(content, factions || []);
  } catch (error) {
    console.warn("Could not connect to Supabase. Showing starter content.", error);
    render(fallback);
  }
}

load();
