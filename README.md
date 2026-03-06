# ⚾ Club Caribe Montería — Sistema de Inscripción 2026

Sistema web completo para la gestión de inscripciones de peloteros del Club Caribe de Montería. Desarrollado con HTML, CSS y JavaScript puro, integrado con Power Automate y Excel Online como base de datos, desplegado en GitHub Pages con CI/CD seguro mediante GitHub Actions.

---

## 🌐 URLs del Sistema

| Página | URL |
|---|---|
| Formulario de inscripción | https://cmenco20.github.io/clubcaribe2026/ |
| Panel de administración | https://cmenco20.github.io/clubcaribe2026/admin.html |

---

## 📁 Estructura de Archivos

```
clubcaribe2026/
├── .github/
│   └── workflows/
│       └── deploy.yml       → Pipeline CI/CD (GitHub Actions)
├── index.html               → Formulario público de inscripción
├── styles.css               → Estilos del formulario
├── app.js                   → Lógica del formulario (v2.2)
├── admin.html               → Panel de administración
├── admin.css                → Estilos del panel admin
├── admin.js                 → Lógica del panel admin
├── logo.png                 → Logo del club
├── .gitignore               → Excluye config.js del repositorio
└── README.md                → Este archivo
```

> ⚠️ `config.js` **NO existe en el repositorio**. Las URLs de Power Automate las inyecta automáticamente el workflow de GitHub Actions en cada deploy.

---

## 🚀 Despliegue — GitHub Actions (CI/CD)

### Cómo funciona

```
git push a rama main
        ↓
GitHub Actions se activa automáticamente
        ↓
Python inyecta las URLs secretas dentro de
index.html y admin.html (en el <head>)
        ↓
Publica los archivos en la rama gh-pages
        ↓
GitHub Pages sirve el sitio desde gh-pages
```

Las URLs nunca quedan expuestas en el repositorio. El archivo `config.js` no existe en `main` — las variables `POWER_AUTOMATE_URL` y `POWER_AUTOMATE_LISTAR_URL` son inyectadas directamente en el HTML durante el build.

### Contenido de `deploy.yml`

```yaml
name: Deploy Club Caribe
on:
  push:
    branches: [main]
permissions:
  contents: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Inyectar URLs en HTML
        env:
          PA_URL: ${{ secrets.POWER_AUTOMATE_URL }}
          PA_LISTAR: ${{ secrets.POWER_AUTOMATE_LISTAR_URL }}
        run: |
          python3 << 'PYEOF'
          import os
          pa_url    = os.environ['PA_URL']
          pa_listar = os.environ['PA_LISTAR']
          script    = f"<script>const POWER_AUTOMATE_URL='{pa_url}';const POWER_AUTOMATE_LISTAR_URL='{pa_listar}';</script>"
          for fname in ['index.html', 'admin.html']:
              with open(fname, 'r', encoding='utf-8') as f:
                  html = f.read()
              html = html.replace('</head>', script + '</head>', 1)
              with open(fname, 'w', encoding='utf-8') as f:
                  f.write(html)
          PYEOF
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
          publish_branch: gh-pages
```

> ⚠️ Se usa **Python** (no `sed`) para inyectar las URLs porque `sed` codifica los caracteres especiales `&`, `=`, `?` de las URLs de Power Automate, corrompiéndolas.

### Configuración inicial (solo una vez)

**1. GitHub Secrets**

Repositorio → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Descripción |
|---|---|
| `POWER_AUTOMATE_URL` | URL del flujo de registro/actualización |
| `POWER_AUTOMATE_LISTAR_URL` | URL del flujo de listado |

**2. GitHub Pages**

Settings → Pages → Source → rama **`gh-pages`** → `/ (raíz)` → Save

**3. Actualizar el sitio**

Subir cualquier cambio a `main` → el workflow despliega automáticamente en ~30 segundos.

### Regenerar URLs de Power Automate

1. En Power Automate → flujo → trigger HTTP → `...` → **Regenerar clave**
2. Copiar la nueva URL
3. GitHub → Settings → Secrets → actualizar el secret correspondiente
4. Hacer un `git push` para re-desplegar

---

## 🔒 Seguridad

| Archivo | Se sube a GitHub | Descripción |
|---|---|---|
| `config.js` | ❌ Nunca | Bloqueado por `.gitignore` |
| `.gitignore` | ✅ Sí | Protege `config.js` |
| `deploy.yml` | ✅ Sí | No contiene URLs — usa Secrets |
| `app.js` | ✅ Sí | Lee URLs desde variables globales inyectadas |
| `admin.js` | ✅ Sí | Lee URLs desde variables globales inyectadas |
| `index.html` | ✅ Sí | Sin URLs — el build las inyecta |
| `admin.html` | ✅ Sí | Sin URLs — el build las inyecta |

---

## ⚡ Power Automate — Flujos

### Archivo Excel

| Propiedad | Valor |
|---|---|
| Ruta en OneDrive | `/clubcaribe/Inscripciones_ClubCaribe.xlsx` |
| Tabla | `Tabla3` |
| Nota importante | Todas las columnas tienen **espacio al inicio** en Excel (ej: ` codigo`, ` tipo_documento`). El código lo resuelve globalmente con `.trim()` en cada lectura |

---

### Flujo 1 — `Caribe - Registro_Actualizacion`

**Propósito:** Verificar duplicados, registrar nuevos inscritos y actualizar registros existentes.
**Secret:** `POWER_AUTOMATE_URL`

**Estructura:**

```
1. Trigger HTTP (POST)
   └── Recibe todos los campos del formulario + "es_actualizacion"

2. Enumerar filas de la tabla
   └── Filtro OData: identificacion eq '@{triggerBody()?['identificacion']}'
       (Excel Online no soporta AND en OData — filtro en 2 pasos)

3. Filtrar matriz
   └── tipo_documento = tipo_documento del trigger

4. Condición: length(body('Filtrar_matriz')) > 0

   ├── TRUE (duplicado encontrado):
   │     └── Obtener una fila   ← ⚠️ DEBE estar aquí dentro
   │           └── Condición: es_actualizacion eq 'Si'
   │                 ├── TRUE:  Actualizar fila
   │                 │         Respuesta: { "existe":true, "actualizado":true }
   │                 └── FALSE: Respuesta con datos del registro
   │                           concat('{"existe":true,"actualizado":false,"datos":',
   │                                   string(body('Obtener_una_fila')), '}')
   │
   └── FALSE (registro nuevo):
         └── Agregar fila
               Respuesta: { "existe":false, "guardado":true }
```

> ⚠️ **Crítico:** "Obtener_una_fila" debe estar **dentro de la rama TRUE**. Si está fuera, el flujo falla al registrar alguien nuevo porque intenta leer una fila inexistente.

**Respuestas JSON:**

| Caso | Respuesta |
|---|---|
| Nuevo exitoso | `{ "existe": false, "guardado": true }` |
| Duplicado detectado | `{ "existe": true, "actualizado": false, "datos": { ...campos... } }` |
| Actualización exitosa | `{ "existe": true, "actualizado": true }` |

---

### Flujo 2 — `Caribe - Listar Registros`

**Propósito:** Devolver todos los registros para el panel admin y calcular el código consecutivo.
**Secret:** `POWER_AUTOMATE_LISTAR_URL`

**Estructura:**

```
1. Trigger HTTP (POST)
2. Enumerar las filas de una tabla (sin filtro)
3. Respuesta HTTP
   Content-Type: application/json
   Body: { "registros": @{body('Enumerar_las_filas_de_una_tabla')?['value']} }
```

---

## 📋 Formulario de Inscripción (`index.html` + `app.js`)

### Secciones

| # | Sección | Campos principales |
|---|---|---|
| 01 | Identificación del Pelotero | Código*, Socio, Tipo doc., Identificación, Nombres, Sexo, Fecha nac., Lugar nac., Dirección, Barrio, Estudio |
| 02 | Representante / Acudiente | Parentesco, Nombre, Cédula, Celular, Tel., Profesión, Correo (hasta 2 representantes) |
| 03 | Contacto de Emergencia | Nombre, Teléfono |
| 04 | Antecedentes Médicos | Alergia, Medicamento, Cirugía, Lesiones, Asma, Enfermedades, Rec. especialista |
| 05 | Béisbol | Estatura, Peso, Tipo sangre, Motivación, Perfil, Posición, Categoría |

*Generado automáticamente, campo de solo lectura.

### Campos obligatorios

| Campo | Condición |
|---|---|
| Tipo de documento | Siempre |
| Identificación | Siempre |
| Nombres y Apellidos | Siempre |
| Sexo | Siempre |
| Fecha de Nacimiento | Siempre |
| Lugar de Nacimiento | Siempre |
| Dirección | Siempre |
| Parentesco Rep. 1 | Siempre |
| Nombre Rep. 1 | Siempre |
| Cédula Rep. 1 | Siempre |
| Celular Rep. 1 | Siempre |
| Parentesco Rep. 2 | Solo si se ingresa Nombre Rep. 2 |
| Contacto emergencia | Siempre |
| Tel. emergencia | Siempre |
| Categoría | Siempre |
| **Alergia (Sí/No)** | **Siempre** |
| **Medicamento (Sí/No)** | **Siempre** |
| **Cirugía (Sí/No)** | **Siempre** |
| **Lesiones (Sí/No)** | **Siempre** |
| **Asma (Sí/No)** | **Siempre** |
| **Rec. especialista (Sí/No)** | **Siempre** |
| ¿Cuál alergia? | Solo si Alergia = **Sí** |
| ¿Cuál medicamento? | Solo si Medicamento = **Sí** |
| ¿Cuál intervención? | Solo si Cirugía = **Sí** |
| ¿Cuál lesión? | Solo si Lesiones = **Sí** |
| Enfermedades actuales | Solo si Asma = **Sí** |
| ¿Cuál recomendación? | Solo si Rec. especialista = **Sí** |

### Validación antecedentes médicos

Cada campo médico tiene **dos niveles de validación**:

1. **Nivel 1 — Sí/No obligatorio:** Si el usuario intenta enviar sin haber seleccionado Sí o No, el `yesno-row` se resalta en rojo. Al seleccionar cualquier opción, el error desaparece automáticamente.

2. **Nivel 2 — ¿Cuál? obligatorio si es Sí:** Si marcó Sí, el campo de texto aparece y debe completarse obligatoriamente.

### Campos automáticos (solo lectura)

- **Código del Pelotero** — Al cargar la página consulta el Flujo 2, encuentra el mayor número del año actual y asigna el siguiente. Formato `YYYY-NNN` (ej: `2026-007`). El año cambia automáticamente cada año.
- **Año de nacimiento (para categoría)** — Se extrae de la Fecha de Nacimiento al seleccionarla.

### Categorías

`Tetero` · `Pony` · `Preinfantil` · `Infantil` · `Prejunior` · `Junior`

### Flujo de una inscripción

```
Llenar formulario → "Enviar Inscripción"
        ↓
validateForm() — verifica todos los campos obligatorios
incluyendo Sí/No en cada antecedente médico
        ↓
POST al Flujo 1  (es_actualizacion: "No")
        ├── { existe:false, guardado:true }
        │     → ✅ Modal éxito + PDF automático
        │
        ├── { existe:true, actualizado:false, datos:{...} }
        │     → Modal "¿Desea actualizar su inscripción?"
        │           ├── Confirma → formulario se llena con datos del Excel
        │           │             → usuario modifica → POST (es_actualizacion:"Si")
        │           │             → ✅ Modal éxito actualización
        │           └── Cancela  → vuelve al formulario
        │
        └── Error HTTP → ❌ Banner rojo
```

### Funciones principales de `app.js`

| Función | Descripción |
|---|---|
| `asignarCodigo()` | Async — consulta PA_LISTAR, calcula máximo del año y asigna siguiente código |
| `validateForm()` | Valida todos los campos obligatorios incluyendo Sí/No médicos |
| `setError(id, bool)` | Agrega/quita clase `field-error` en el div contenedor |
| `generatePDF(data)` | Genera PDF A4 completo con jsPDF, sin servidor |
| `showSuccessModal(data)` | Muestra modal de éxito y dispara el PDF |
| `showUpdateModal(...)` | Carga datos del Excel en el formulario para actualización |
| `excelSerialToDisplay(v)` | Convierte serial numérico de Excel a fecha `DD/MM/YYYY` |
| `resetForm()` | Limpia el formulario y reasigna código consecutivo |

### Conversión de fechas de Excel

Excel guarda las fechas como **número serial** (ej: `43149` = 18/02/2018). El sistema convierte usando aritmética pura para evitar problemas de zona horaria (Colombia UTC-5):

```javascript
// Corrige bug histórico de Excel: trata incorrectamente 1900 como año bisiesto
if (serial >= 60) serial--;
// Calcula día/mes/año sumando desde 1 enero 1900 sin usar objeto Date
```

---

## 🛡️ Panel de Administración (`admin.html` + `admin.js`)

### Funcionalidades

| Función | Descripción |
|---|---|
| 📊 Estadísticas | Total inscritos, socios del club, categoría con más jugadores |
| 🔍 Búsqueda en tiempo real | Por nombre, documento, código o representante |
| 📂 Filtro por categoría | Desplegable con todas las categorías |
| ↕️ Ordenar columnas | Clic en cualquier encabezado de columna |
| 👁️ Ver detalle | Modal con todos los 55+ campos del pelotero |
| 🖨️ Imprimir PDF | Genera el PDF oficial para cualquier registro |
| 📊 Exportar Excel | Descarga `ClubCaribe_Inscripciones_YYYY.xlsx` completo |
| 🔄 Actualizar datos | Recarga desde OneDrive en tiempo real |

### Columnas de la tabla

`Código` · `Nombres y Apellidos` · `Documento` · `Fecha Nac.` · `Categoría` · `Contacto` · `Fecha Registro` · `Acciones`

### Funciones principales de `admin.js`

| Función | Descripción |
|---|---|
| `cargarRegistros()` | Async — llama PA_LISTAR y carga todos los registros |
| `limpiarRegistro(r)` | Normaliza claves con `.trim()` para manejar el espacio al inicio |
| `actualizarStats()` | Calcula y muestra las tarjetas de estadísticas |
| `renderTabla()` | Renderiza la tabla HTML con los registros filtrados |
| `aplicarFiltros()` | Filtra por texto y categoría en tiempo real |
| `sortBy(col)` | Ordena la tabla por columna con toggle asc/desc |
| `verDetalle(idx)` | Abre modal con todos los datos del pelotero |
| `imprimirPDF(idx)` | Normaliza fechas y llama `generatePDF` de `app.js` |
| `serialExcelAFecha(n)` | Convierte serial Excel a `DD/MM/YYYY` |
| `fmtFecha(v)` | Detecta si el valor es serial o string y formatea |

---

## 🖨️ Generación de PDF

Generado con **jsPDF 2.5.1** directamente en el navegador, sin servidor. Características:

- Encabezado con logo del club, nombre y año
- Marca de agua diagonal semitransparente
- Todas las secciones organizadas en tabla con celdas de colores alternos
- Funciones internas: `r1()`, `r2()`, `r3()`, `r4()` para filas de 1 a 4 columnas
- Líneas de firma al final
- Formato A4, diseñado en una sola página

Se genera en dos contextos:
1. **Automáticamente** al completar una inscripción exitosa (`showSuccessModal`)
2. **Manualmente** desde el admin con el botón 🖨️ (`imprimirPDF`)

---

## 🔧 Dependencias Externas (CDN)

| Librería | Versión | Uso |
|---|---|---|
| jsPDF | 2.5.1 | Generación de PDF en el navegador |
| SheetJS (xlsx) | 0.18.5 | Exportar Excel desde el panel admin |
| Google Fonts | — | Fuentes Oswald (títulos) y Open Sans (cuerpo) |

---

## 🗂️ Columnas del Excel (`Tabla3`)

> ⚠️ Todas las columnas tienen **espacio al inicio** en Excel. El código lo resuelve con `Object.keys(r).find(k => k.trim() === 'campo')` y `.trim()` en cada acceso.

```
codigo, socio, tipo_documento, identificacion, nombres_apellidos, sexo,
fecha_nacimiento, lugar_nacimiento, direccion, barrio, donde_estudia,
grado, jornada, otro_club, otro_club_cual, otro_club_tiempo,
rep1_parentesco, rep1_otro_parentesco, rep1_nombre, rep1_cedula,
rep1_celular, rep1_telefono, rep1_profesion, rep1_correo,
rep2_parentesco, rep2_otro_parentesco, rep2_nombre, rep2_cedula,
rep2_celular, rep2_telefono, rep2_profesion, rep2_correo,
emergencia_nombre, emergencia_telefono, estatura, peso, tipo_sangre, motivacion,
alergia, alergia_cual, medicamento, medicamento_cual,
cirugia, cirugia_cual, lesiones, lesiones_cual,
asma, enfermedades_actuales, recomendacion_especialista, recomendacion_cual,
perfil, posicion_juego, categoria, año_categoria, fecha_registro
```

---

## 🔁 Cambio de año automático

El sistema no requiere ningún cambio de código al cambiar de año:

- `asignarCodigo()` usa `new Date().getFullYear()` → en 2027 generará `2027-001`
- El filtro busca códigos que empiecen con el año actual

Si se desea nueva tabla Excel para el año nuevo:
1. Crear nuevo `.xlsx` con la misma estructura de columnas
2. Actualizar la ruta en los 2 flujos de Power Automate
3. Actualizar los Secrets en GitHub con las nuevas URLs si cambiaron
4. Hacer `git push` para redesplegar

---

## ⚠️ Problemas conocidos y soluciones

| Problema | Causa | Solución aplicada |
|---|---|---|
| GitGuardian — secret expuesto | URLs hardcodeadas subidas a GitHub | GitHub Secrets + inyección por Python en deploy.yml |
| `config.js` da 404 | `.gitignore` bloquea el archivo + GitHub Pages sirve antes del commit | Cambio de estrategia: inyección directa en HTML vía Actions |
| URLs corruptas (`%3C`, `%3D`) | `sed` codifica caracteres especiales de las URLs de PA | Usar `python3` para reemplazar texto — maneja URLs sin modificarlas |
| Fecha muestra número (`43149`) | Excel guarda fechas como serial numérico | Algoritmo aritmético `serialExcelAFecha()` en `app.js` y `admin.js` |
| Fecha desfasada 1 día | Timezone UTC-5 + bug año bisiesto 1900 de Excel | `if (n >= 60) n--` antes de calcular la fecha |
| Antecedentes médicos sin validar Sí/No | Solo se validaba el campo `¿Cuál?` si era Sí | Validación de 2 niveles: Sí/No obligatorio + ¿Cuál? si es Sí |
| `yesno-row` no mostraba error visual | `setError` opera en divs — faltaba CSS `field-error` para ese elemento | Agregado `.yesno-row.field-error` en `styles.css` |
| Código sube cada recarga | Caché del navegador con archivo viejo | Ctrl+Shift+R o abrir en incógnito |
| Error 502 al registrar | Flujo PA caído o conexión OneDrive expirada | Revisar historial en Power Automate |
| `asignarCodigo is not defined` | `index.html` viejo con JS embebido + `app.js` duplicando declaraciones | Reemplazar `index.html` con versión sin JS embebido |
| "Obtener_una_fila" falla en registro nuevo | Acción fuera de la rama TRUE del flujo de PA | Moverla dentro del TRUE de la condición principal |
| Errores de "message channel closed" | Extensiones del navegador (ej: bloqueadores) | No afectan el sistema — desaparecen en modo incógnito |

---

## 👨‍💻 Tecnologías

| Tecnología | Uso |
|---|---|
| HTML5 / CSS3 / JavaScript Vanilla | Frontend — sin frameworks ni dependencias de build |
| Microsoft Power Automate | Automatización — lógica de negocio y conexión con Excel |
| Microsoft Excel Online / OneDrive | Base de datos de inscripciones |
| GitHub Pages | Hosting estático gratuito |
| GitHub Actions | CI/CD — despliegue automático con inyección segura de secrets |
| GitHub Secrets | Almacenamiento seguro de URLs privadas de Power Automate |
| jsPDF 2.5.1 | Generación de PDF A4 en el cliente |
| SheetJS (xlsx) 0.18.5 | Exportación a Excel desde el panel admin |
| Google Fonts | Tipografías Oswald y Open Sans |
