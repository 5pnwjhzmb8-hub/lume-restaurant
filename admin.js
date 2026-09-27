const SUPABASE_URL="https://wmdqayyqxzejypuwvtzp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_jvnVs92FjUV9g5xF9i2N_Q_t_5mC0yt";

const sb=window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const loginView=document.getElementById("loginView");
const adminView=document.getElementById("adminView");
const loginForm=document.getElementById("loginForm");
const loginMsg=document.getElementById("loginMsg");
const tablesEl=document.getElementById("tables");
const logout=document.getElementById("logout");
const statusEl=document.getElementById("status");

const reservationDate=document.getElementById("reservationDate");
const reservationsList=document.getElementById("reservationsList");
const blockDate=document.getElementById("blockDate");
const blockTime=document.getElementById("blockTime");
const blockTable=document.getElementById("blockTable");
const blockReason=document.getElementById("blockReason");
const blockButton=document.getElementById("blockButton");
const blocksList=document.getElementById("blocksList");

async function boot(){

  const {
    data:{session}
  }=await sb.auth.getSession();

  showSession(session);

  sb.auth.onAuthStateChange(
    (_event,session)=>{
      showSession(session);
    }
  );
}

function showSession(session){

  const logged=!!session;

  loginView.hidden=logged;
  adminView.hidden=!logged;
  logout.hidden=!logged;

  if(logged){

    const today=new Date()
      .toISOString()
      .slice(0,10);

    if(reservationDate){
      reservationDate.value=today;
    }

    loadTables();
    loadReservations();
    loadBlockTables();
loadBlocks();
  }
}

loginForm.addEventListener(
  "submit",
  async e=>{

    e.preventDefault();

    loginMsg.textContent="Entrando…";

    const emailInput=document.getElementById("email");
    const passwordInput=document.getElementById("password");

    const {
      error
    }=await sb.auth.signInWithPassword({

      email:emailInput.value.trim(),

      password:passwordInput.value

    });

    loginMsg.textContent=
      error ? error.message : "";
  }
);

logout.addEventListener(
  "click",
  ()=>sb.auth.signOut()
);

reservationDate?.addEventListener(
  "change",
  loadReservations
);

async function loadTables(){

  statusEl.textContent="Cargando mesas…";

  const {
    data,
    error
  }=await sb
    .from("mesas")
    .select(
      "id,numero,estado,capacidad"
    )
    .order("numero");

  if(error){

    statusEl.textContent=
      "Error: "+error.message;

    return;
  }

  statusEl.textContent=
    `${data.filter(
      x=>x.estado==="disponible"
    ).length} disponibles · ${data.length} mesas`;

  tablesEl.innerHTML=data.map(t=>{

    const free=
      t.estado==="disponible";

    return `
      <article class="table ${
        free
        ?"available-card"
        :"busy-card"
      }">

        <span class="state ${
          free
          ?"available"
          :"busy"
        }">
          ${
            free
            ?"DISPONIBLE"
            :"OCUPADA"
          }
        </span>

        <span class="num">
          Mesa ${t.numero}
        </span>

        <span class="meta">
          Hasta ${t.capacidad} personas
        </span>

        <button
          type="button"
          data-id="${t.id}"
          data-state="${
            free
            ?"ocupada"
            :"disponible"
          }"
        >
          ${
            free
            ?"Marcar ocupada"
            :"Marcar disponible"
          }
        </button>

      </article>
    `;

  }).join("");

  tablesEl
    .querySelectorAll("button")
    .forEach(button=>{

      button.addEventListener(
        "click",
        ()=>{
          updateTable(
            button.dataset.id,
            button.dataset.state
          );
        }
      );

    });

  if(window.__channel)return;

  window.__channel=
    sb
      .channel("lume-admin-tables")
      .on(
        "postgres_changes",
        {
          event:"*",
          schema:"public",
          table:"mesas"
        },
        loadTables
      )
      .subscribe();
}

async function updateTable(
  id,
  state
){

  const {
    error
  }=await sb
    .from("mesas")
    .update({
      estado:state
    })
    .eq("id",id);

  if(error){

    alert(error.message);

  }else{

    loadTables();

  }
}

async function loadReservations(){

  if(!reservationDate)return;

  reservationsList.innerHTML=
    "<p>Cargando reservas…</p>";

  const {
    data,
    error
  }=await sb
    .from("reservas")
    .select(
      "id,nombre,telefono,email,fecha,hora,personas,mesa_id,estado"
    )
    .eq(
      "fecha",
      reservationDate.value
    )
    .order("hora");

  if(error){

    reservationsList.innerHTML=
      `<p>Error: ${error.message}</p>`;

    return;
  }

  if(!data.length){

    reservationsList.innerHTML=
      "<p>No hay reservas para este día.</p>";

    return;
  }

  reservationsList.innerHTML=
    data.map(r=>{

      const hora=
        String(r.hora).slice(0,5);

      return `
        <article class="reservation-card">

          <div>
            <strong>${hora}</strong>
            <span>${r.nombre}</span>
          </div>

          <div>
            <span>${r.personas} personas</span>
            <span>Tel. ${r.telefono}</span>
          </div>

          ${
            r.email
            ? `<small>${r.email}</small>`
            : ""
          }

          <span class="reservation-status">
            ${r.estado}
          </span>

        </article>
      `;

    }).join("");
}
async function loadBlockTables(){

  if(!blockTable)return;

  const {
    data,
    error
  }=await sb
    .from("mesas")
    .select("id,numero,capacidad")
    .order("numero");

  if(error){
    console.error(error);
    return;
  }

  blockTable.innerHTML=data.map(m=>`
    <option value="${m.id}">
      Mesa ${m.numero} · hasta ${m.capacidad} personas
    </option>
  `).join("");
}


async function loadBlocks(){

  if(!blockDate || !blocksList)return;

  blocksList.innerHTML="<p>Cargando bloqueos…</p>";

  const {
    data,
    error
  }=await sb
    .from("bloqueos_mesas")
    .select("id,mesa_id,fecha,hora,motivo,mesas(numero)")
    .eq("fecha",blockDate.value)
    .order("hora");

  if(error){

    blocksList.innerHTML=
      `<p>Error: ${error.message}</p>`;

    return;
  }

  if(!data.length){

    blocksList.innerHTML=
      "<p>No hay mesas bloqueadas para este día.</p>";

    return;
  }

  blocksList.innerHTML=data.map(b=>{

    const hora=String(b.hora).slice(0,5);

    return `
      <article class="reservation-card">

        <div>
          <strong>Mesa ${b.mesas?.numero ?? "—"}</strong>
          <span>${hora}</span>
        </div>

        <div>
          <span>${b.motivo || "Sin motivo"}</span>
        </div>

        <button
          type="button"
          data-block-id="${b.id}"
        >
          Desbloquear
        </button>

      </article>
    `;

  }).join("");

  blocksList
    .querySelectorAll("[data-block-id]")
    .forEach(button=>{

      button.addEventListener(
        "click",
        ()=>{
          deleteBlock(button.dataset.blockId);
        }
      );

    });
}


blockButton?.addEventListener(
  "click",
  createBlock
);


blockDate?.addEventListener(
  "change",
  loadBlocks
);


async function createBlock(){

  if(!blockDate.value){

    alert("Selecciona una fecha.");
    return;
  }

  if(!blockTable.value){

    alert("Selecciona una mesa.");
    return;
  }

  const {
    error
  }=await sb
    .from("bloqueos_mesas")
    .insert({

      mesa_id:Number(blockTable.value),

      fecha:blockDate.value,

      hora:blockTime.value,

      motivo:blockReason.value.trim() || null

    });

  if(error){

    if(error.code==="23505"){

      alert(
        "Esa mesa ya está bloqueada para ese horario."
      );

    }else{

      alert(error.message);

    }

    return;
  }

  blockReason.value="";

  await loadBlocks();

}


async function deleteBlock(id){

  const {
    error
  }=await sb
    .from("bloqueos_mesas")
    .delete()
    .eq("id",id);

  if(error){

    alert(error.message);
    return;

  }

  loadBlocks();

}

boot();