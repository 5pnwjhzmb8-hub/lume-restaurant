const SUPABASE_URL="https://wmdqayyqxzejypuwvtzp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_jvnVs92FjUV9g5xF9i2N_Q_t_5mC0yt";

const sb=window.supabase?.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const intro=document.getElementById("intro");
const header=document.getElementById("header");
const modal=document.getElementById("bookingModal");
const slots=document.getElementById("slots");
const connection=document.getElementById("connection");
const form=document.getElementById("bookingForm");
const date=document.getElementById("date");
const people=document.getElementById("people");

const nameInput=document.getElementById("name");
const phoneInput=document.getElementById("phone");
const emailInput=document.getElementById("email");

let selectedTime=null;

document.addEventListener("DOMContentLoaded",()=>{

  setTimeout(()=>intro?.classList.add("play"),80);
  setTimeout(()=>intro?.classList.add("done"),2200);

  if(date){
    date.min=new Date().toISOString().slice(0,10);
    date.value=date.min;
  }

  document.querySelectorAll("[data-open-booking]")
    .forEach(b=>b.addEventListener("click",openBooking));
document.querySelectorAll('a[href="#carta"]').forEach(link => {
  link.addEventListener("click", event => {
    const destino = document.getElementById("carta");

    if (!destino) return;

    event.preventDefault();

    destino.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});
  document.getElementById("closeBooking")
    ?.addEventListener("click",closeBooking);

  modal?.addEventListener("click",e=>{
    if(e.target===modal) closeBooking();
  });

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") closeBooking();
  });

  document.getElementById("menuBtn")
    ?.addEventListener("click",()=>{
      header?.classList.toggle("open");
    });

  window.addEventListener("scroll",()=>{
    header?.classList.toggle("scrolled",scrollY>40);
  },{passive:true});

  const io=new IntersectionObserver(
    es=>es.forEach(e=>{
      if(e.isIntersecting) e.target.classList.add("visible");
    }),
    {threshold:.12}
  );

  document.querySelectorAll(".reveal").forEach(x=>io.observe(x));

  form?.addEventListener("submit",e=>{
    e.preventDefault();
    loadAvailability();
  });

  date?.addEventListener("change",loadAvailability);
  people?.addEventListener("change",loadAvailability);

  loadAvailability();
});


function openBooking() {
  modal?.classList.add("open");
  modal?.setAttribute("aria-hidden", "false");

  loadAvailability();
}

function closeBooking(){
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden","true");
}

function setConnection(ok,msg){
  if(!connection) return;

  connection.classList.toggle("off",!ok);

  const text=connection.querySelector("b");
  if(text) text.textContent=msg;
}

async function loadAvailability(){

  if(!sb){
    setConnection(false,"Supabase no cargado");
    return;
  }

  try{

    setConnection(false,"Consultando disponibilidad…");

    const fecha=date?.value;
    const personas=Number(people?.value||2);

    const {data,error}=await sb.rpc(
      "get_availability",
      {
        p_fecha:fecha,
        p_personas:personas
      }
    );

    if(error) throw error;

    renderSlots(data||[]);

    setConnection(
      true,
      "Disponibilidad conectada en tiempo real"
    );

  }catch(err){

    console.error(err);

    slots.innerHTML=`
      <div class="slot disabled">
        <strong>—</strong>
        <small>No se pudo consultar la disponibilidad</small>
      </div>
    `;

    setConnection(
      false,
      "No se pudo conectar con Supabase"
    );
  }
}

function renderSlots(data){

  selectedTime=null;

  if(!slots) return;

  if(!data.length){

    slots.innerHTML=`
      <div class="slot disabled">
        <strong>—</strong>
        <small>No hay horarios disponibles</small>
      </div>
    `;

    return;
  }

  slots.innerHTML=data.map(item=>{

    const hora=String(item.hora).slice(0,5);
    const disponibles=Number(item.mesas_disponibles);

    if(disponibles<=0){

      return `
        <div class="slot disabled">
          <strong>${hora}</strong>
          <small>Sin mesa disponible</small>
        </div>
      `;

    }

    return `
      <button
        class="slot"
        type="button"
        data-time="${hora}"
      >
        <strong>${hora}</strong>
        <small>
          ${disponibles}
          mesa${disponibles===1?"":"s"} disponible${disponibles===1?"":"s"}
        </small>
      </button>
    `;

  }).join("");

  slots.querySelectorAll("button.slot").forEach(button=>{

    button.addEventListener("click",()=>{

      slots
        .querySelectorAll(".slot")
        .forEach(x=>x.classList.remove("chosen"));

      button.classList.add("chosen");

      selectedTime=button.dataset.time;

      button.innerHTML=`
        <strong>${selectedTime}</strong>
        <small>Horario seleccionado</small>
      `;

      reserveTable();
    });

  });
}

async function reserveTable(){

  if(!selectedTime){
    alert("Selecciona un horario.");
    return;
  }

  if(!nameInput?.value.trim()){
    alert("Escribe tu nombre.");
    nameInput?.focus();
    return;
  }

  if(!phoneInput?.value.trim()){
    alert("Escribe tu teléfono.");
    phoneInput?.focus();
    return;
  }

  if(!date?.value){
    alert("Selecciona una fecha.");
    return;
  }

  try{

    setConnection(false,"Confirmando tu reserva…");

    const {data,error}=await sb.rpc(
      "create_reservation",
      {
        p_nombre:nameInput.value.trim(),
        p_telefono:phoneInput.value.trim(),
        p_email:emailInput?.value.trim() || null,
        p_fecha:date.value,
        p_hora:selectedTime,
        p_personas:Number(people?.value||2)
      }
    );

    if(error) throw error;

    setConnection(true,"Reserva confirmada");

    slots.innerHTML=`
      <div class="slot chosen">
        <strong>Reserva confirmada</strong>
        <small>
          ${date.value} · ${selectedTime} · ${people.value} personas
        </small>
      </div>
    `;

  }catch(err){

    console.error(err);

    if(String(err.message||"").includes("NO_MESA")){

      alert(
        "Lo sentimos, esa mesa acaba de ser reservada. Elige otro horario."
      );

      loadAvailability();

    }else{

      alert(
        "No hemos podido completar la reserva. Inténtalo de nuevo."
      );

      setConnection(
        false,
        "No se pudo confirmar la reserva"
      );
    }
  }
}