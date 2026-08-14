const teams = Array.isArray(window.GDF_TEAMS) ? window.GDF_TEAMS : [];

const scheduleData = {
  "Texas":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "BYU":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "Texas A&M":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "Oklahoma":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]]
};

let selected = "Texas";

const signupConference = document.getElementById("signupConference");
const signupTeam = document.getElementById("signupTeam");
const scheduleTeam = document.getElementById("scheduleTeam");
const scheduleList = document.getElementById("scheduleList");
const planInput = document.getElementById("planInput");
const selectedPlan = document.getElementById("selectedPlan");

function conferences(){
  return [...new Set(teams.map(t => t.conf))].sort();
}

function teamsForConference(conf){
  return teams.filter(t => t.conf === conf).sort((a,b) => a.name.localeCompare(b.name));
}

function populateSignupConference(){
  if(!signupConference || !signupTeam) return;
  signupConference.innerHTML = "";
  conferences().forEach(conf => signupConference.add(new Option(conf, conf)));

  const texas = teams.find(t => t.name === "Texas") || teams[0];
  if(texas){
    selected = texas.name;
    signupConference.value = texas.conf;
  }
  populateSignupTeams();
}

function populateSignupTeams(){
  if(!signupConference || !signupTeam) return;
  const list = teamsForConference(signupConference.value);
  signupTeam.innerHTML = "";
  list.forEach(t => signupTeam.add(new Option(t.name, t.name)));

  if(list.some(t => t.name === selected)){
    signupTeam.value = selected;
  } else if(list.length){
    selected = list[0].name;
    signupTeam.value = selected;
  }
  syncScheduleAndPreview();
}

function populateScheduleTeams(){
  if(!scheduleTeam) return;
  scheduleTeam.innerHTML = "";
  teams.forEach(t => scheduleTeam.add(new Option(t.name, t.name)));
  scheduleTeam.value = selected;
  renderSchedule();
}

function renderSchedule(){
  if(!scheduleTeam || !scheduleList) return;
  const team = scheduleTeam.value || selected;
  const games = scheduleData[team] || [
    ["Week 1","Schedule pending","TBA"],
    ["Week 2","Schedule pending","TBA"],
    ["Week 3","Schedule pending","TBA"]
  ];
  scheduleList.innerHTML = games.map(g =>
    `<div class="game"><time>${g[0]}</time><b>${team} vs. ${g[1]}</b><span class="home">${g[2]}</span></div>`
  ).join("");
}

function syncPreviewTeam(){
  const previewTeam = document.getElementById("previewTeam");
  if(!previewTeam) return;
  const team = (signupTeam && signupTeam.value) || selected || "Texas";
  const match = teams.find(t => t.name === team);
  previewTeam.textContent = match ? match.abbr : team.slice(0,4).toUpperCase();
}

function syncScheduleAndPreview(){
  if(signupTeam && signupTeam.value) selected = signupTeam.value;
  if(scheduleTeam){
    scheduleTeam.value = selected;
    renderSchedule();
  }
  syncPreviewTeam();
}

populateSignupConference();
populateScheduleTeams();
syncPreviewTeam();

if(signupConference){
  signupConference.addEventListener("change", populateSignupTeams);
}
if(signupTeam){
  signupTeam.addEventListener("change", syncScheduleAndPreview);
}
if(scheduleTeam){
  scheduleTeam.addEventListener("change", () => {
    selected = scheduleTeam.value;
    const match = teams.find(t => t.name === selected);
    if(match && signupConference && signupTeam){
      signupConference.value = match.conf;
      populateSignupTeams();
      signupTeam.value = selected;
    }
    syncPreviewTeam();
    renderSchedule();
  });
}

if(planInput && selectedPlan){
  selectedPlan.textContent = `Membership plan: ${planInput.value}`;
  planInput.addEventListener("change", () => {
    selectedPlan.textContent = `Membership plan: ${planInput.value}`;
  });
}

document.querySelectorAll(".checkout-button").forEach(button => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;
    if(planInput) planInput.value = plan;
    if(selectedPlan) selectedPlan.textContent = `Membership plan: ${plan}`;
    document.getElementById("join")?.scrollIntoView({behavior:"smooth"});
  });
});

const menu = document.querySelector(".menu");
const nav = document.querySelector(".site-header nav");
if(menu && nav){
  menu.addEventListener("click", () => {
    nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(nav.classList.contains("open")));
  });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
}

window.addEventListener("scroll", () => {
  document.querySelector(".site-header")?.classList.toggle("compact", window.scrollY > 30);
});

// Home photo preview
const homePhoto = document.getElementById("homePhoto");
const previewImage = document.getElementById("previewImage");
if(homePhoto && previewImage){
  homePhoto.addEventListener("change", () => {
    const file = homePhoto.files && homePhoto.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => previewImage.src = e.target.result;
    reader.readAsDataURL(file);
  });
}
document.getElementById("clearPreview")?.addEventListener("click", () => {
  if(previewImage) previewImage.src = "assets/hero-neighborhood.jpg";
  if(homePhoto) homePhoto.value = "";
});

// Draggable flag preview
const homePreview = document.getElementById("homePreview");
const flagPreview = document.getElementById("flagPreview");
if(homePreview && flagPreview){
  let dragging = false, offsetX = 0, offsetY = 0;
  flagPreview.addEventListener("pointerdown", e => {
    dragging = true;
    flagPreview.setPointerCapture(e.pointerId);
    const rect = flagPreview.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  });
  flagPreview.addEventListener("pointermove", e => {
    if(!dragging) return;
    const parent = homePreview.getBoundingClientRect();
    const flag = flagPreview.getBoundingClientRect();
    let x = e.clientX - parent.left - offsetX;
    let y = e.clientY - parent.top - offsetY;
    x = Math.max(0, Math.min(x, parent.width - flag.width));
    y = Math.max(0, Math.min(y, parent.height - flag.height));
    flagPreview.style.left = `${x}px`;
    flagPreview.style.top = `${y}px`;
  });
  ["pointerup","pointercancel"].forEach(evt => flagPreview.addEventListener(evt, () => dragging = false));
}

// Secure Stripe checkout
const signup = document.getElementById("signup");
if(signup){
  signup.addEventListener("submit", async e => {
    e.preventDefault();

    const status = document.getElementById("formStatus");
    const payButton = document.getElementById("payButton");
    const data = Object.fromEntries(new FormData(signup).entries());

    if(payButton){
      payButton.disabled = true;
      payButton.textContent = "Opening Secure Checkout…";
    }
    if(status) status.textContent = "Creating your secure Stripe checkout session…";

    try{
      const response = await fetch("/api/create-checkout-session", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(data)
      });

      const raw = await response.text();
      let result = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch (_) {}

      if(!response.ok || !result.url){
        throw new Error(result.error || `Unable to start checkout (${response.status}).`);
      }

      window.location.href = result.url;
    }catch(error){
      if(status) status.textContent = error.message || "Payment setup is temporarily unavailable. Please call 801-528-8697.";
      if(payButton){
        payButton.disabled = false;
        payButton.textContent = "Continue to Secure Payment";
      }
    }
  });
}
