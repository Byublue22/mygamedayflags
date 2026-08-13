
const teams = Array.isArray(window.GDF_TEAMS) ? window.GDF_TEAMS : [];
const scheduleData = {
  "BYU":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "Texas":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "Texas A&M":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "Oklahoma":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]]
};

const grid=document.getElementById("teamGrid");
const search=document.getElementById("teamSearch");
const conf=document.getElementById("conference");
const signupTeam=document.getElementById("signupTeam");
const scheduleTeam=document.getElementById("scheduleTeam");
let selected="BYU";

function fillConferenceFilter(){
  [...new Set(teams.map(t=>t.conf))].sort().forEach(name=>conf.add(new Option(name,name)));
}
function fillTeamSelects(){
  teams.forEach(t=>{
    signupTeam.add(new Option(t.name,t.name));
    scheduleTeam.add(new Option(t.name,t.name));
  });
  signupTeam.value=selected;
  scheduleTeam.value=selected;
}
function renderTeams(){
  const q=search.value.trim().toLowerCase();
  const c=conf.value;
  grid.innerHTML="";
  const matches=teams.filter(t=>
    (t.name.toLowerCase().includes(q)||t.abbr.toLowerCase().includes(q)) &&
    (c==="all"||t.conf===c)
  );
  matches.forEach(t=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="team-card"+(t.name===selected?" selected":"");
    button.innerHTML=`<span class="mark">${t.abbr}</span><b>${t.name}</b><small>${t.conf}</small>`;
    button.addEventListener("click",()=>{
      selected=t.name;
      signupTeam.value=t.name;
      scheduleTeam.value=t.name;
      renderTeams();
      renderSchedule();
      document.getElementById("join").scrollIntoView({behavior:"smooth"});
    });
    grid.appendChild(button);
  });
  if(!matches.length) grid.innerHTML='<p class="no-results">No matching team. Use the Team Manager to add it.</p>';
}
function renderSchedule(){
  const team=scheduleTeam.value;
  const games=scheduleData[team]||[
    ["Week 1","Schedule pending","TBA"],
    ["Week 2","Schedule pending","TBA"],
    ["Week 3","Schedule pending","TBA"]
  ];
  document.getElementById("scheduleList").innerHTML=games.map(g=>
    `<div class="game"><time>${g[0]}</time><b>${team} vs. ${g[1]}</b><span class="home">${g[2]}</span></div>`
  ).join("");
}
fillConferenceFilter();
fillTeamSelects();
renderTeams();
renderSchedule();

search.addEventListener("input",renderTeams);
conf.addEventListener("change",renderTeams);
scheduleTeam.addEventListener("change",renderSchedule);

const menu=document.querySelector(".menu");
const nav=document.querySelector(".site-header nav");
menu.addEventListener("click",()=>{
  nav.classList.toggle("open");
  menu.setAttribute("aria-expanded",nav.classList.contains("open"));
});
document.querySelectorAll("nav a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
window.addEventListener("scroll",()=>document.querySelector(".site-header").classList.toggle("compact",scrollY>30));

const observer=new IntersectionObserver(entries=>entries.forEach(e=>{
  if(e.isIntersecting)e.target.classList.add("visible");
}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

document.getElementById("signup").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.target;
  const status=document.getElementById("formStatus");
  const payButton=document.getElementById("payButton");
  const data=Object.fromEntries(new FormData(form).entries());

  if(!data.plan){
    status.textContent="Please choose the Early Bird or Regular membership plan first.";
    document.getElementById("pricing").scrollIntoView({behavior:"smooth"});
    return;
  }

  payButton.disabled=true;
  payButton.textContent="Opening Secure Checkout…";
  status.textContent="Creating your secure Stripe checkout session…";

  try{
    const response=await fetch("/api/create-checkout-session",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(data)
    });
    const result=await response.json();
    if(!response.ok || !result.url) throw new Error(result.error||"Unable to start checkout.");
    window.location.href=result.url;
  }catch(error){
    status.textContent=error.message||"Payment setup is temporarily unavailable. Please call 801-528-8697.";
    payButton.disabled=false;
    payButton.textContent="Continue to Secure Payment";
  }
});


// VERSION 4: membership plan selector
document.querySelectorAll(".checkout-button").forEach(button=>{
  button.addEventListener("click",()=>{
    const plan=button.dataset.plan;
    document.getElementById("planInput").value=plan;
    document.getElementById("selectedPlan").textContent=`Membership plan: ${plan}`;
    document.getElementById("join").scrollIntoView({behavior:"smooth"});
  });
});

// Keep the preview flag label synchronized with the selected team.
function syncPreviewTeam(){
  const team=signupTeam.value || selected || "GDF";
  const match=teams.find(t=>t.name===team);
  document.getElementById("previewTeam").textContent=match ? match.abbr : team.slice(0,4).toUpperCase();
}
signupTeam.addEventListener("change",syncPreviewTeam);
scheduleTeam.addEventListener("change",()=>{
  const team=scheduleTeam.value;
  signupTeam.value=team;
  selected=team;
  syncPreviewTeam();
  renderTeams();
});
syncPreviewTeam();

// Local-only home photo preview.
const homePhoto=document.getElementById("homePhoto");
const previewImage=document.getElementById("previewImage");
homePhoto.addEventListener("change",()=>{
  const file=homePhoto.files && homePhoto.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>previewImage.src=e.target.result;
  reader.readAsDataURL(file);
});
document.getElementById("clearPreview").addEventListener("click",()=>{
  previewImage.src="assets/hero-neighborhood.jpg";
  homePhoto.value="";
});

// Drag the flag within the preview area.
const homePreview=document.getElementById("homePreview");
const flagPreview=document.getElementById("flagPreview");
let dragging=false, offsetX=0, offsetY=0;
flagPreview.addEventListener("pointerdown",e=>{
  dragging=true;
  flagPreview.setPointerCapture(e.pointerId);
  const rect=flagPreview.getBoundingClientRect();
  offsetX=e.clientX-rect.left;
  offsetY=e.clientY-rect.top;
});
flagPreview.addEventListener("pointermove",e=>{
  if(!dragging) return;
  const parent=homePreview.getBoundingClientRect();
  const flag=flagPreview.getBoundingClientRect();
  let x=e.clientX-parent.left-offsetX;
  let y=e.clientY-parent.top-offsetY;
  x=Math.max(0,Math.min(x,parent.width-flag.width));
  y=Math.max(0,Math.min(y,parent.height-flag.height));
  flagPreview.style.left=`${x}px`;
  flagPreview.style.top=`${y}px`;
});
flagPreview.addEventListener("pointerup",()=>dragging=false);
flagPreview.addEventListener("pointercancel",()=>dragging=false);
