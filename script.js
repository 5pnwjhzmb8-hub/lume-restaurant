const SUPABASE_URL="https://wmdqayyqxzejypuwvtzp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_jvnVs92FjUV9g5xF9i2N_Q_t_5mC0yt";
const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const intro=document.getElementById("intro"),header=document.getElementById("header"),modal=document.getElementById("bookingModal"),slots=document.getElementById("slots"),connection=document.getElementById("connection"),form=document.getElementById("bookingForm"),date=document.getElementById("date"),people=document.getElementById("people");
let publicChannel=null;

document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>intro?.classList.add("play"),80);
  setTimeout(()=>intro?.classList.add("done"),2200);
  date.min=new Date().toISOString().slice(0,10); date.value=date.min;
  document.querySelectorAll("[data-open-booking]").forEach(b=>b.addEventListener("click",openBooking));
  document.getElementById("closeBooking")?.addEventListener("click",closeBooking);
  modal?.addEventListener("click",e=>{if(e.target===modal)closeBooking()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeBooking()});
  document.getElementById("menuBtn")?.addEventListener("click",()=>header?.classList.toggle("open"));
  window.addEventListener("scroll",()=>header?.classList.toggle("scrolled",scrollY>40),{passive:true});
  const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add("visible")),{threshold:.12});
  document.querySelectorAll(".reveal").forEach(x=>io.observe(x));
  form?.addEventListener("submit",e=>{e.preventDefault();loadAvailability()});
  loadAvailability();
  if(sb) subscribeToTableChanges();
});

function openBooking(){modal?.classList.add("open");modal?.setAttribute("aria-hidden","false");loadAvailability()}
function closeBooking(){modal?.classList.remove("open");modal?.setAttribute("aria-hidden","true")}
async function getTables(){
  if(!sb) throw new Error("Supabase no cargado");
  const {data,error}=await sb.from("mesas").select("id,numero,estado,capacidad").order("numero");
  if(error) throw error; return data||[];
}
function setConnection(ok,msg){if(!connection)return;connection.classList.toggle("off",!ok);connection.querySelector("b").textContent=msg}
function renderSlots(tables){
  const n=Number(people?.value||2);
  const available=tables.filter(t=>String(t.estado).toLowerCase()==="disponible"&&Number(t.capacidad)>=n);
  const times=["20:00","20:30","21:00","21:30","22:00"];
  slots.innerHTML=times.map(t=>available.length
    ? `<button class="slot" type="button" data-time="${t}"><strong>${t}</strong><small>${available.length} mesa${available.length===1?"":"s"} disponible${available.length===1?"":"s"}</small></button>`
    : `<div class="slot disabled"><strong>${t}</strong><small>Sin mesa disponible</small></div>`).join("");
  slots.querySelectorAll("button.slot").forEach(b=>b.addEventListener("click",()=>{
    slots.querySelectorAll(".slot").forEach(x=>x.classList.remove("chosen"));
    b.classList.add("chosen"); b.innerHTML=`<strong>${b.dataset.time}</strong><small>Horario seleccionado</small>`;
  }));
}
async function loadAvailability(){
  try{setConnection(false,"Consultando disponibilidad…");const tables=await getTables();renderSlots(tables);setConnection(true,"Disponibilidad conectada en tiempo real")}
  catch(err){console.error(err);slots.innerHTML='<div class="slot disabled"><strong>—</strong><small>No se pudo conectar con el restaurante</small></div>';setConnection(false,"No se pudo conectar con Supabase")}
}
function subscribeToTableChanges(){
  publicChannel=sb.channel("lume-public-tables").on("postgres_changes",{event:"*",schema:"public",table:"mesas"},()=>loadAvailability()).subscribe();
}
