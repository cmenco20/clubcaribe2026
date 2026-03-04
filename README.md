# 📋 Sistema de Inscripciones — Club CARIBE Montería 2026

Sistema web para registrar inscripciones de jugadores del **Club Caribe Montería**, con almacenamiento automático en:

* Google Sheets (base principal de datos)
* Excel / OneDrive mediante Microsoft Power Automate
* Generación automática de PDF con los datos de inscripción

El sistema está desarrollado con **HTML + CSS + JavaScript puro**, sin frameworks.

---

# 📁 Estructura del Proyecto

```
/
├── index.html
├── styles.css
├── app.js
└── README.md
```

| Archivo      | Descripción                                  |
| ------------ | -------------------------------------------- |
| `index.html` | Formulario completo de inscripción           |
| `styles.css` | Estilos visuales del sistema                 |
| `app.js`     | Lógica del sistema (validación, envío y PDF) |
| `README.md`  | Guía de instalación y configuración          |

---

# ⚙️ Arquitectura del Sistema

```
Usuario llena formulario
        ↓
Validación de duplicado (Google Sheets)
        ↓
Guardar registro en Google Sheets
        ↓
Enviar copia a Excel (Power Automate)
        ↓
Generar PDF automático
```

### Ventajas de esta arquitectura

* No requiere backend propio
* Funciona desde cualquier servidor web
* Datos centralizados en Google Sheets
* Copia de respaldo en Excel / OneDrive
* Compatible con dispositivos móviles

---

# 🗄️ PASO 1 — Crear la hoja en Google Sheets

1. Abrir:

https://sheets.google.com

2. Crear una hoja nueva.

3. Nombrar la hoja exactamente como:

```
Inscripciones Club Caribe 2026
```

4. En la **fila 1** colocar los siguientes encabezados:

```
fecha_registro | tipo_documento | identificacion | nombres_apellidos | socio | codigo |
sexo | fecha_nacimiento | lugar_nacimiento | direccion | barrio | donde_estudia |
grado | jornada | otro_club | otro_club_cual | otro_club_tiempo |
rep1_parentesco | rep1_nombre | rep1_cedula | rep1_celular | rep1_telefono |
rep1_profesion | rep1_correo | rep2_parentesco | rep2_nombre | rep2_cedula |
rep2_celular | rep2_telefono | rep2_profesion | rep2_correo |
emergencia_nombre | emergencia_telefono | estatura | peso | tipo_sangre |
motivacion | alergia | alergia_cual | medicamento | medicamento_cual |
cirugia | cirugia_cual | lesiones | lesiones_cual | asma | enfermedades_actuales |
posicion | lanzamiento | batea | brazo_fuerte | categoria | año_categoria
```

⚠️ Los nombres deben coincidir exactamente con los campos del formulario.

---

# ⚙️ PASO 2 — Crear el Web App en Apps Script

Dentro de la hoja de Google Sheets:

```
Extensiones → Apps Script
```

Eliminar cualquier código existente y pegar el siguiente:

```javascript
const SHEET_NAME = 'Inscripciones Club Caribe 2026';

function doGet(e) {

  const action = e.parameter.action;

  if (action === 'check') {
    return checkDuplicate(e.parameter.tipo, e.parameter.id);
  }

  return jsonResponse({ error:'Acción no reconocida' });
}

function doPost(e){

  const action = e.parameter.action;

  if(action === "save"){

    const record = JSON.parse(e.parameter.data);
    return saveRecord(record);

  }

  return jsonResponse({ success:false });

}

function checkDuplicate(tipoDoc,numDoc){

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const tipoIdx = headers.indexOf('tipo_documento');
  const idIdx = headers.indexOf('identificacion');

  for(let i=1;i<data.length;i++){

    if(data[i][tipoIdx] == tipoDoc &&
       String(data[i][idIdx]) == String(numDoc)){

        const rowObj = {};
        headers.forEach((h,j)=> rowObj[h] = data[i][j]);

        return jsonResponse({ exists:true, data:rowObj });

    }

  }

  return jsonResponse({ exists:false });

}

function saveRecord(record){

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const data = sheet.getDataRange().getValues();

  const tipoIdx = headers.indexOf('tipo_documento');
  const idIdx = headers.indexOf('identificacion');

  for(let i=1;i<data.length;i++){

    if(data[i][tipoIdx] == record.tipo_documento &&
       String(data[i][idIdx]) == String(record.identificacion)){

        const row = headers.map(h => record[h] ?? data[i][headers.indexOf(h)]);

        sheet.getRange(i+1,1,1,row.length).setValues([row]);

        return jsonResponse({ success:true, action:'updated' });

    }

  }

  const newRow = headers.map(h => record[h] ?? '');

  sheet.appendRow(newRow);

  return jsonResponse({ success:true, action:'inserted' });

}

function jsonResponse(obj){

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

}
```

---

# 🚀 PASO 3 — Publicar el Web App

En Apps Script:

```
Implementar
→ Nueva implementación
→ Aplicación web
```

Configurar:

```
Ejecutar como: Mi cuenta
Acceso: Cualquier persona
```

Luego copiar la URL generada:

```
https://script.google.com/macros/s/XXXXXXXXXXXX/exec
```

---

# 🔗 PASO 4 — Configurar `app.js`

Abrir el archivo `app.js` y configurar las URLs:

```javascript
const GOOGLE_SCRIPT_URL = "PEGAR_URL_APPS_SCRIPT"
const POWER_AUTOMATE_URL = "PEGAR_URL_POWER_AUTOMATE"
```

---

# ☁️ PASO 5 — Configurar Power Automate (Excel)

1. Ir a:

https://make.powerautomate.com

2. Crear flujo:

```
Cuando se recibe una solicitud HTTP
```

3. Agregar acción:

```
Agregar fila a tabla Excel
```

4. Conectar con archivo `.xlsx` en OneDrive.

5. Copiar la URL HTTP POST generada.

6. Pegarlo en:

```
POWER_AUTOMATE_URL
```

---

# 🌐 PASO 6 — Subir los archivos al servidor

Subir los siguientes archivos al mismo directorio del servidor web:

```
index.html
styles.css
app.js
```

El sistema funciona en cualquier hosting o servidor web.

---

# 📄 Generación automática de PDF

Cuando el registro se guarda correctamente:

1. Se generan los datos del jugador
2. Se crea un PDF automáticamente
3. El navegador descarga el documento

El PDF sirve como **comprobante de inscripción**.

---

# 🔄 Actualizar Apps Script

Cada vez que modifiques el código:

```
Implementar
→ Administrar implementaciones
→ Editar
→ Nueva versión
```

No cambia la URL.

---

# 🛠️ Solución de problemas

| Problema              | Posible causa             | Solución                      |
| --------------------- | ------------------------- | ----------------------------- |
| No guarda en Sheets   | URL incorrecta            | Revisar GOOGLE_SCRIPT_URL     |
| Error CORS            | Código antiguo            | Usar versión actual de app.js |
| Excel no recibe datos | Power Automate incorrecto | Revisar URL del flujo         |
| PDF no descarga       | jsPDF no cargó            | Verificar internet            |

---

# ⚾ Club CARIBE Montería

Sistema digital de inscripción de jugadores
Temporada **2026**
