
const teams = Array.isArray(window.GDF_TEAMS) ? window.GDF_TEAMS : [];
const scheduleData = {
  "BYU":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "Texas":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "Texas A&M":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]],
  "Oklahoma":[["Week 1","Schedule pending","TBA"],["Week 2","Schedule pending","TBA"],["Week 3","Schedule pending","TBA"]]
};

const signupTeam=document.getElementById("signupTeam");
const signupConference=document.getElementById("signupConference");
const scheduleTeam=document.getElementById("scheduleTeam");
let selected="Texas";

function fillTeamSelects(){
  const conferences=[...new Set(teams.map(t=>t.conf))].sort();
  signupConference.innerHTML="";
  conferences.forEach(c=>signupConference.add(new Option(c,c)));

  const texas=teams.find(t=>t.name==="Texas") || teams[0];
  if(texas){
    selected=texas.name;
    signupConference.value=texas.conf;
  }
  renderSignupTeams();

  scheduleTeam.innerHTML="";
  teams.forEach(t=>scheduleTeam.add(new Option(t.name,t.name)));
  scheduleTeam.value=selected;
}

function renderSignupTeams(){
  const conference=signupConference.value;
  const list=teams.filter(t=>t.conf===conference).sort((a,b)=>a.name.localeCompare(b.name));
  signupTeam.innerHTML="";
  list.forEach(t=>signupTeam.add(new Option(t.name,t.name)));

  if(list.some(t=>t.name===selected)){
    signupTeam.value=selected;
  } else if(list.length){
    signupTeam.value=list[0].name;
    selected=list[0].name;
  }
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
fillTeamSelects();
renderConferenceTeamSelectors();
renderSchedule();

scheduleTeam.addEventListener("change",renderSchedule);
signupConference.addEventListener("change",()=>{
  renderSignupTeams();
  scheduleTeam.value=signupTeam.value;
  selected=signupTeam.value;
  renderSchedule();
  syncPreviewTeam();
});
signupTeam.addEventListener("change",()=>{
  selected=signupTeam.value;
  scheduleTeam.value=selected;
  renderSchedule();
  syncPreviewTeam();
});

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


planInput.addEventListener("change",()=>{
  selectedPlan.textContent=`Membership plan: ${planInput.value}`;
});
document.getElementById("signup").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.target;
  const status=document.getElementById("formStatus");
  const payButton=document.getElementById("payButton");
  const data=Object.fromEntries(new FormData(form).entries());
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
  const team=signupTeam.value || selected || "Texas";
  const match=teams.find(t=>t.name===team);
  document.getElementById("previewTeam").textContent=match ? match.abbr : team.slice(0,4).toUpperCase();
}
signupTeam.addEventListener("change",syncPreviewTeam);
scheduleTeam.addEventListener("change",()=>{
  const team=scheduleTeam.value;
  signupTeam.value=team;
  selected=team;
  syncPreviewTeam();
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
