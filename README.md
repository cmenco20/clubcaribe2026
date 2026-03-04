# 📋 Instrucciones de Configuración — Club CARIBE Montería

Guía completa para poner en producción el sistema de inscripciones.

---

## 📁 Estructura de Archivos

```
/
├── index.html          ← Formulario principal (HTML puro)
├── styles.css          ← Todos los estilos del formulario
├── app.js              ← Toda la lógica JavaScript
└── INSTRUCCIONES.md    ← Este archivo
```

---

## 🗄️ PASO 1 — Crear la hoja de Google Sheets

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva.
2. Nómbrala exactamente: **`Inscripciones Club Caribe 2026`**
3. En la **fila 1** coloca estos encabezados (cópialos y pégalos tal cual):

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

---

## ⚙️ PASO 2 — Crear el Web App en Google Apps Script

1. En la hoja de Google Sheets, ve al menú **Extensiones → Apps Script**.
2. Borra el contenido por defecto del editor.
3. Pega el siguiente código completo:

```javascript
const SHEET_NAME = 'Inscripciones Club Caribe 2026';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'check') {
    return checkDuplicate(e.parameter.tipo, e.parameter.id);
  }
  return jsonResponse({ error: 'Acción no reconocida' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    return saveRecord(body);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function checkDuplicate(tipoDoc, numDoc) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  const headers  = data[0];
  const tipoIdx  = headers.indexOf('tipo_documento');
  const idIdx    = headers.indexOf('identificacion');

  for (let i = 1; i < data.length; i++) {
    if (data[i][tipoIdx] === tipoDoc && String(data[i][idIdx]) === String(numDoc)) {
      const rowObj = {};
      headers.forEach((h, j) => rowObj[h] = data[i][j]);
      return jsonResponse({ exists: true, data: rowObj });
    }
  }
  return jsonResponse({ exists: false });
}

function saveRecord(record) {
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const tipoIdx = headers.indexOf('tipo_documento');
  const idIdx   = headers.indexOf('identificacion');
  const data    = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][tipoIdx] === record.tipo_documento &&
        String(data[i][idIdx]) === String(record.identificacion)) {
      const row = headers.map(h => record[h] !== undefined ? record[h] : '');
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return jsonResponse({ success: true, action: 'updated' });
    }
  }

  const row = headers.map(h => record[h] !== undefined ? record[h] : '');
  sheet.appendRow(row);
  return jsonResponse({ success: true, action: 'inserted' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 🚀 PASO 3 — Publicar el Web App

1. Haz clic en el botón **"Implementar"** (arriba a la derecha).
2. Selecciona **"Nueva implementación"**.
3. Elige tipo: **"Aplicación web"**.
4. Configura:
   - **Ejecutar como:** Mi cuenta
   - **Quién tiene acceso:** Cualquier persona
5. Haz clic en **"Implementar"** y copia la URL que aparece.

> ⚠️ La URL tiene este formato:
> `https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec`

---

## 🔗 PASO 4 — Configurar las URLs en `app.js`

Abre `app.js` y localiza las dos primeras líneas de configuración:

```javascript
const POWER_AUTOMATE_URL = "https://...";   // URL de Power Automate (Excel)
const GOOGLE_SCRIPT_URL  = "https://...";   // URL del Web App de Apps Script
```

Reemplaza los valores con las URLs correspondientes y guarda el archivo.

---

## 🌐 PASO 5 — Subir los archivos al servidor

Sube los siguientes 3 archivos al mismo directorio de tu servidor web:

| Archivo | Descripción |
|---|---|
| `index.html` | Estructura del formulario |
| `styles.css` | Estilos y apariencia |
| `app.js` | Lógica, validación y PDF |

> Los tres deben estar en la **misma carpeta** para que las referencias relativas funcionen.

---

## ✅ Cómo funciona la validación de duplicados

```
Usuario ingresa tipo + número de documento
        ↓
Consulta Google Sheets (en tiempo real)
        ↓
¿Existe?  ─── SÍ ──→ Muestra modal "¿Actualizar o cancelar?"
   │
   NO
   ↓
Envía a Google Sheets + Power Automate (simultáneo)
        ↓
Genera PDF con los datos y lo descarga automáticamente
```

- ✅ Funciona en **todos los dispositivos y navegadores**
- ✅ Datos centralizados en **Google Sheets**
- ✅ Copia de respaldo en **Excel / OneDrive** vía Power Automate
- ✅ Fallback automático a caché local si Google Sheets no está disponible

---

## 🔄 Actualizar el Web App (si cambias el código de Apps Script)

Cada vez que modifiques el código en Apps Script:

1. Haz clic en **"Implementar"** → **"Gestionar implementaciones"**.
2. Selecciona tu implementación activa y haz clic en el ícono de edición ✏️.
3. En **"Versión"** selecciona **"Nueva versión"**.
4. Guarda. La URL **no cambia**, no necesitas actualizar `app.js`.

---

## 🛠️ Solución de Problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Formulario no valida duplicados | URL de Apps Script incorrecta | Verificar `GOOGLE_SCRIPT_URL` en `app.js` |
| No se guarda en Excel | URL de Power Automate vencida | Regenerar el flow en Power Automate |
| El PDF no se genera | jsPDF no cargó | Verificar conexión a internet (CDN) |
| Estilos no aplican | `styles.css` no encontrado | Verificar que los 3 archivos estén en el mismo directorio |

---


  <!-- SETUP BOX -->
  <div class="setup-box">
    <strong>⚙️ Configuración OneDrive</strong> — Para enviar datos automáticamente, usa <strong>Microsoft Power Automate</strong>:<br>
    1. Ve a <a href="https://make.powerautomate.com" target="_blank">make.powerautomate.com</a> → Crear flujo → <strong>"Cuando se recibe una solicitud HTTP"</strong><br>
    2. Agrega la acción <strong>"Agregar fila a tabla Excel"</strong> apuntando a un archivo <code>.xlsx</code> en tu OneDrive.<br>
    3. Copia la URL HTTP POST y pégala en la variable <code>POWER_AUTOMATE_URL</code> del código.
  </div> 




*Club CARIBE Montería — Sistema de Inscripciones 2026*
