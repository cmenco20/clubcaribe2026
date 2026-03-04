/* ============================================================
   Club CARIBE Montería — app.js final
   Google Sheets + Power Automate + Validaciones
============================================================ */

const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbyq7FMvEThptqsjAbXX6pXyg27G97yhS0hjPrlroCB4t7JqNg19_l1u4OnGInKYOX0xRw/exec";

const POWER_AUTOMATE_URL =
"https://defaultb468904add5149289435b961241d32.77.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/80dc9e0f901146269d6c5a40c9bb0931/triggers/manual/paths/invoke";


/* ============================================================
VALIDAR FORMULARIO
============================================================ */

function validateForm(){

  const errores = [];

  const nombre = document.querySelector('[name="nombres_apellidos"]')?.value.trim();
  const tipo   = document.querySelector('[name="tipo_documento"]')?.value;
  const id     = document.querySelector('[name="identificacion"]')?.value.trim();
  const direccion = document.querySelector('[name="direccion"]')?.value.trim();
  const celular = document.querySelector('[name="rep1_celular"]')?.value.trim();
  const nacimiento = document.querySelector('[name="fecha_nacimiento"]')?.value;

  if(!nombre) errores.push("Debe ingresar el nombre del jugador");
  if(!tipo) errores.push("Seleccione el tipo de documento");
  if(!id) errores.push("Ingrese el número de identificación");

  if(!document.querySelector('[name="sexo"]:checked'))
    errores.push("Seleccione el sexo");

  if(!document.querySelector('[name="socio"]:checked'))
    errores.push("Indique si es socio del club");

  if(!direccion)
    errores.push("Ingrese la dirección");

  if(!celular)
    errores.push("Ingrese el celular del representante");

  if(celular && !/^[0-9]{10}$/.test(celular))
    errores.push("El celular debe tener exactamente 10 dígitos");

  if(nacimiento){

    const hoy = new Date();
    const nacimientoDate = new Date(nacimiento);

    let edad = hoy.getFullYear() - nacimientoDate.getFullYear();

    const m = hoy.getMonth() - nacimientoDate.getMonth();

    if (m < 0 || (m === 0 && hoy.getDate() < nacimientoDate.getDate())) {
        edad--;
    }

    if(edad < 4 || edad > 18){
      errores.push("La edad del jugador debe estar entre 4 y 18 años");
    }

  }

  return errores;

}


/* ============================================================
OBTENER DATOS FORMULARIO
============================================================ */

function getFormData(form){

  const formData = new FormData(form);
  const obj = {};

  formData.forEach((value,key)=>{
    obj[key] = value;
  });

  return obj;

}


/* ============================================================
TIMESTAMP
============================================================ */

function getTimestamp(){

  const now = new Date();
  return now.toLocaleString("es-CO");

}


/* ============================================================
VERIFICAR DUPLICADO EN SHEETS
============================================================ */

async function checkDuplicate(tipo,id){

  const params = new URLSearchParams({
    action:"check",
    tipo:tipo,
    id:id
  });

  const url = GOOGLE_SCRIPT_URL + "?" + params.toString();

  const response = await fetch(url);
  return await response.json();

}


/* ============================================================
GUARDAR EN GOOGLE SHEETS
============================================================ */

async function saveToSheets(data){

  const params = new URLSearchParams();
  params.append("action","save");
  params.append("data",JSON.stringify(data));

  const url = GOOGLE_SCRIPT_URL + "?" + params.toString();

  const response = await fetch(url);
  return await response.json();

}


/* ============================================================
ENVIAR A POWER AUTOMATE
============================================================ */

async function sendToPowerAutomate(data){

  try{

    await fetch(POWER_AUTOMATE_URL,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify(data)
    });

  }
  catch(error){

    console.warn("Power Automate no respondió",error);

  }

}


/* ============================================================
ENVÍO FORMULARIO
============================================================ */

async function handleSubmit(e){

  e.preventDefault();

  const errores = validateForm();

  if(errores.length){

    alert(
      "Debe corregir los siguientes campos:\n\n• " +
      errores.join("\n• ")
    );

    return;

  }

  const form = e.target;

  let data = getFormData(form);

  data.fecha_registro = getTimestamp();

  /* VALIDAR DUPLICADO */

  const duplicado = await checkDuplicate(
    data.tipo_documento,
    data.identificacion
  );

  if(duplicado && duplicado.exists){

    alert("Este jugador ya se encuentra registrado");
    return;

  }

  /* GUARDAR EN SHEETS */

  const save = await saveToSheets(data);

  if(!save.success){

    alert("Error guardando en la base de datos");
    return;

  }

  /* ENVIAR A POWER AUTOMATE */

  sendToPowerAutomate(data);

  alert("Registro guardado correctamente");

  form.reset();

}


/* ============================================================
INICIALIZACIÓN
============================================================ */

document.addEventListener("DOMContentLoaded",()=>{

  const form = document.getElementById("formInscripcion");

  if(!form){
    console.error("Formulario no encontrado");
    return;
  }

  form.addEventListener("submit",handleSubmit);

});