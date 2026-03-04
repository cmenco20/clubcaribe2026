/* ============================================================
   Club Caribe Montería
   app.js optimizado
============================================================ */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyq7FMvEThptqsjAbXX6pXyg27G97yhS0hjPrlroCB4t7JqNg19_l1u4OnGInKYOX0xRw/exec";

const POWER_AUTOMATE_URL = "https://defaultb468904add5149289435b961241d32.77.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/80dc9e0f901146269d6c5a40c9bb0931/triggers/manual/paths/invoke";

/* ============================================================
   UTILIDADES
============================================================ */

function getFormData(form) {

  const formData = new FormData(form);
  const obj = {};

  formData.forEach((value, key) => {
    obj[key] = value;
  });

  return obj;
}

/* ============================================================
   CONSULTAR DUPLICADO
============================================================ */

async function checkDuplicate(tipo, id) {

  const params = new URLSearchParams({
    action: "check",
    tipo: tipo,
    id: id
  });

  const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;

  try {

    const response = await fetch(url);
    return await response.json();

  } catch (error) {

    console.error("Error verificando duplicado:", error);
    return null;

  }

}


/* ============================================================
  HORARIO TIMESTAMP 
============================================================ */


function getTimestamp(){

  const now = new Date();

  const fecha = now.toLocaleDateString("es-CO");
  const hora  = now.toLocaleTimeString("es-CO");

  return `${fecha} ${hora}`;

}


/* ============================================================
   GUARDAR EN GOOGLE SHEETS
============================================================ */

async function saveToGoogleSheets(data) {

  const formData = new URLSearchParams();

  formData.append("action", "save");
  formData.append("data", JSON.stringify(data));

  try {

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: formData
    });

    return await response.json();

  } catch (error) {

    console.error("Error guardando en Sheets:", error);
    return { success:false };

  }

}

/* ============================================================
   ENVIAR A POWER AUTOMATE
============================================================ */

async function sendToPowerAutomate(data) {

  try {

    await fetch(POWER_AUTOMATE_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(data)
    });

  } catch(error) {

    console.warn("Power Automate error:",error);

  }

}

/* ============================================================
   GENERAR PDF
============================================================ */

function generatePDF(data){

  doc.text(`Fecha registro: ${data.fecha_registro}`,20,30);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Club Caribe Beisbol - Montería", 20,20);

  doc.setFontSize(12);

  let y = 40;

  for (const key in data){

    doc.text(`${key}: ${data[key]}`,20,y);
    y += 8;

  }

  doc.save("inscripcion.pdf");

}

/* ============================================================
   PROCESAR FORMULARIO
============================================================ */

async function handleSubmit(e){

  e.preventDefault();

  const form = e.target;

  const data = getFormData(form);
  data.fecha_registro = getTimestamp();

  const tipo = data.tipo_documento;
  const id   = data.identificacion;
  

  /* ---- validar duplicado ---- */

  const check = await checkDuplicate(tipo,id);

  if(check && check.exists){

    alert("La persona ya está registrada");
    return;

  }

  /* ---- guardar ---- */

  const save = await saveToGoogleSheets(data);

  if(!save.success){

    alert("Error guardando información");
    return;

  }

  /* ---- enviar a power automate ---- */

  sendToPowerAutomate(data);

  /* ---- generar PDF ---- */

  generatePDF(data);

  alert("Registro guardado correctamente");

  form.reset();

}

/* ============================================================
   INICIALIZACIÓN
============================================================ */

document.addEventListener("DOMContentLoaded",()=>{

  const form = document.querySelector("#form-inscripcion");

  if(form){

    form.addEventListener("submit",handleSubmit);

  }

});