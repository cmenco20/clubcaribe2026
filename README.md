# ⚾ Club Caribe Montería — Sistema de Inscripción 2026

Sistema web completo para gestión de inscripciones de peloteros del Club Caribe de Montería. Permite registrar nuevos jugadores, detectar duplicados, actualizar registros existentes y administrar todos los inscritos desde un panel de administración.

---

## 📁 Estructura de Archivos

```
clubcaribe/
├── index.html       → Formulario público de inscripción
├── styles.css       → Estilos del formulario
├── app.js           → Lógica JS del formulario (validación, PDF, Power Automate)
├── admin.html       → Panel de administración
├── admin.css        → Estilos del panel admin
├── admin.js         → Lógica JS del panel admin
├── logo.png         → Logo del club (agregar manualmente)
└── README.md        → Este archivo
```

> ⚠️ Los 6 archivos deben estar en la **misma carpeta** del repositorio para que funcionen correctamente.

---

## 🌐 Despliegue

El sistema está publicado en **GitHub Pages**:

- **Formulario:** `https://cmenco20.github.io/clubcaribe2026/`
- **Admin:** `https://cmenco20.github.io/clubcaribe2026/admin.html`

Para actualizar, sube los archivos modificados al repositorio GitHub y espera ~1 minuto para que GitHub Pages propague los cambios. Si el navegador muestra la versión anterior, fuerza recarga con **Ctrl+Shift+R** o abre en **modo incógnito**.

---

## ⚡ Power Automate — Flujos

El sistema usa **2 flujos de Power Automate** que se conectan con un archivo Excel en OneDrive.

### Archivo Excel

| Propiedad | Valor |
|---|---|
| Ruta | `/clubcaribe/Inscripciones_ClubCaribe.xlsx` |
| Tabla | `Tabla3` |
| Nota | Los nombres de columna en Excel tienen un **espacio al inicio** (ej: ` codigo`, ` tipo_documento`). Esto es normal y el código lo maneja con `.trim()` |

---

### Flujo 1 — `Caribe - Registro_Actualizacion`

**Propósito:** Verificar duplicados, registrar nuevos inscritos y actualizar registros existentes. Es el flujo principal del formulario.

**URL:**
```
https://defaultb468904add5149289435b961241d32.77.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/af0ee7edcc7042f5881d4e0b8e376e4c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rmE7DqkZkiYNmdvaP2xKdZFnkhjjp2GH2rsXpK8q8lc
```

**Estructura del flujo:**

```
1. Trigger HTTP (POST)
   └── Recibe todos los campos del formulario + campo "es_actualizacion"

2. Enumerar filas de la tabla
   └── Filtro OData: identificacion eq '@{triggerBody()?['identificacion']}'

3. Filtrar matriz
   └── Condición: tipo_documento = tipo_documento del trigger
   (Nota: Excel Online no soporta operador AND en OData, por eso se filtra en dos pasos)

4. Condición principal: length(body('Filtrar_matriz')) > 0

   ├── TRUE (registro duplicado encontrado):
   │     └── Obtener una fila (clave: identificacion)
   │           └── Condición 1: es_actualizacion eq 'Si'
   │                 ├── TRUE: Actualizar fila → Respuesta { existe:true, actualizado:true }
   │                 └── FALSE: Respuesta 2 con datos del registro
   │                       concat('{ "existe": true, "actualizado": false, "datos": ',
   │                              string(body('Obtener_una_fila')), '}')
   │
   └── FALSE (registro nuevo):
         └── Agregar fila → Respuesta 1 { existe:false, guardado:true }
```

> ⚠️ **Importante:** La acción "Obtener_una_fila" debe estar dentro de la rama **TRUE** de la condición, NO antes. Si está fuera, falla cuando se intenta registrar alguien nuevo (el registro no existe todavía).

**Respuestas posibles:**

| Caso | JSON de respuesta |
|---|---|
| Registro nuevo exitoso | `{ "existe": false, "guardado": true }` |
| Duplicado detectado | `{ "existe": true, "actualizado": false, "datos": { ...campos del Excel... } }` |
| Actualización exitosa | `{ "existe": true, "actualizado": true }` |

---

### Flujo 2 — `Caribe - Listar Registros`

**Propósito:** Devolver todos los registros de la tabla para el panel de administración y para calcular el código consecutivo automático.

**URL:**
```
https://defaultb468904add5149289435b961241d32.77.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b2e8b902c13247c189ba5ca06229c726/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ofcWfmPhhwalhBntZJxojji4jF6KeUoqddIdtqS7168
```

**Estructura del flujo:**

```
1. Trigger HTTP (POST)

2. Enumerar las filas de una tabla
   └── Sin filtro (devuelve todos los registros)

3. Respuesta HTTP
   └── Content-Type: application/json
   └── Body: { "registros": @{body('Enumerar_las_filas_de_una_tabla')?['value']} }
```

---

## 📋 Formulario de Inscripción (`index.html`)

### Secciones del formulario

| # | Sección | Campos principales |
|---|---|---|
| 01 | Identificación del Pelotero | Código, Socio, Tipo doc., Identificación, Nombres, Sexo, Fecha nac., Lugar nac., Dirección, Barrio |
| 02 | Representante / Acudiente | Parentesco, Nombre, Cédula, Celular, Tel., Profesión, Correo (x2 representantes) |
| 03 | Contacto de Emergencia | Nombre, Teléfono |
| 04 | Antecedentes Médicos | Alergia, Medicamento, Cirugía, Lesiones, Asma, Enfermedades, Rec. especialista |
| 05 | Béisbol | Estatura, Peso, Tipo sangre, Motivación, Perfil, Posición, Categoría |

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
| Parentesco Rep. 2 | Solo si se ingresa nombre Rep. 2 |
| Contacto emergencia | Siempre |
| Tel. emergencia | Siempre |
| Categoría | Siempre |
| ¿Cuál alergia? | Solo si alergia = Sí |
| ¿Cuál medicamento? | Solo si medicamento = Sí |
| ¿Cuál intervención? | Solo si cirugía = Sí |
| ¿Cuál lesión? | Solo si lesiones = Sí |
| Enfermedades actuales | Solo si asma = Sí |
| ¿Cuál recomendación? | Solo si rec. especialista = Sí |

### Campos automáticos (solo lectura)

- **Código del Pelotero** — Se genera consultando el flujo de listar. Toma el mayor número registrado en el año actual y suma 1. Formato: `YYYY-NNN` (ej: `2026-001`). El año cambia automáticamente cada año.
- **Año de nacimiento (para categoría)** — Se extrae automáticamente del campo Fecha de Nacimiento.

### Categorías disponibles

`Tetero` · `Pony` · `Preinfantil` · `Infantil` · `Prejunior` · `Junior`

### Flujo del formulario

```
Usuario llena el formulario
        ↓
Hace clic en "Enviar Inscripción"
        ↓
validateForm() — verifica campos obligatorios
        ↓
Envía al Flujo 1 con es_actualizacion: "No"
        ↓
¿Respuesta del flujo?
        ├── { existe:false, guardado:true }
        │     → Modal de éxito + genera PDF automáticamente
        │
        ├── { existe:true, actualizado:false, datos:{...} }
        │     → Modal "¿Desea actualizar?"
        │           ├── Confirma → llena formulario con datos del Excel
        │           │             → usuario modifica → envía con es_actualizacion:"Si"
        │           │             → { existe:true, actualizado:true } → Modal éxito
        │           └── Cancela → vuelve al formulario
        │
        └── Error HTTP
              → Banner de error rojo
```

### Conversión de fechas de Excel

Excel almacena las fechas como **número serial** (ej: `43149` = 18/02/2018). El sistema convierte este número usando el siguiente algoritmo:

```javascript
// Corrección del bug de Excel: trata 1900 como año bisiesto incorrectamente
if (serial >= 60) serial--;
// Luego calcula día/mes/año iterando desde el 1 de enero de 1900
```

---

## 🛡️ Panel de Administración (`admin.html`)

### Funcionalidades

| Función | Descripción |
|---|---|
| 📊 Estadísticas | Total inscritos, socios, categoría más grande |
| 🔍 Búsqueda | Por nombre, documento, código o nombre de representante |
| 📂 Filtro | Por categoría |
| ↕️ Ordenar | Clic en cualquier columna del encabezado |
| 👁️ Ver detalle | Modal con todos los datos del pelotero |
| 🖨️ Imprimir PDF | Genera el mismo PDF del formulario para cualquier registro |
| 📊 Exportar Excel | Descarga todos los registros en `.xlsx` con todas las columnas |
| 🔄 Actualizar | Recarga los datos desde el Excel en OneDrive |

### Columnas de la tabla

`Código` · `Nombres y Apellidos` · `Documento` · `Fecha Nac.` · `Categoría` · `Contacto` · `Fecha Registro` · `Acciones`

### Exportación Excel

Al hacer clic en **Exportar Excel**, el sistema genera un archivo `.xlsx` con **47 columnas** incluyendo todos los datos del formulario. El archivo se llama `ClubCaribe_Inscripciones_YYYY.xlsx`.

---

## 🖨️ Generación de PDF

El PDF se genera con **jsPDF** directamente en el navegador (sin servidor). Incluye:

- Encabezado con logo, nombre del club y año
- Marca de agua diagonal con el nombre del club
- Todas las secciones del formulario organizadas en tabla
- Líneas de firma al final
- Formato A4, una sola página

El PDF se genera:
1. **Automáticamente** al completar una inscripción exitosa
2. **Manualmente** desde el admin con el botón 🖨️ por cada pelotero

---

## 🔧 Dependencias Externas (CDN)

| Librería | Versión | Uso |
|---|---|---|
| jsPDF | 2.5.1 | Generación de PDF en el navegador |
| SheetJS (xlsx) | 0.18.5 | Exportación a Excel desde el admin |
| Google Fonts | — | Fuentes Oswald y Open Sans |

---

## 🗂️ Columnas del Excel (`Tabla3`)

> Nota: todas las columnas tienen un espacio al inicio en Excel (` codigo`, ` tipo_documento`, etc.)

```
codigo, socio, tipo_documento, identificacion, nombres_apellidos, sexo,
fecha_nacimiento, lugar_nacimiento, direccion, barrio, donde_estudia,
grado, jornada, otro_club, otro_club_cual, otro_club_tiempo,
rep1_parentesco, rep1_otro_parentesco, rep1_nombre, rep1_cedula,
rep1_celular, rep1_telefono, rep1_profesion, rep1_correo,
rep2_parentesco, rep2_otro_parentesco, rep2_nombre, rep2_cedula,
rep2_celular, rep2_telefono, rep2_profesion, rep2_correo,
emergencia_nombre, emergencia_telefono,
estatura, peso, tipo_sangre, motivacion,
alergia, alergia_cual, medicamento, medicamento_cual,
cirugia, cirugia_cual, lesiones, lesiones_cual,
asma, enfermedades_actuales, recomendacion_especialista, recomendacion_cual,
perfil, posicion_juego, categoria, año_categoria, fecha_registro
```

---

## 🚀 Cómo agregar un nuevo año

El sistema está preparado para cambiar de año automáticamente:

1. **Código consecutivo** — usa `new Date().getFullYear()` → en 2027 generará `2027-001`
2. **No requiere ningún cambio de código** para el cambio de año

Si se desea empezar una nueva tabla Excel para el año nuevo:
1. Crear nuevo archivo Excel con la misma estructura de columnas
2. Actualizar la ruta del archivo en los flujos de Power Automate
3. La numeración empezará desde `2027-001` automáticamente

---

## ⚠️ Problemas conocidos y soluciones

| Problema | Causa | Solución |
|---|---|---|
| Fecha muestra número (ej: `43149`) | Excel guarda fechas como serial numérico | El código convierte automáticamente con corrección del bug 1900 de Excel |
| Código incrementa cada recarga | Caché del navegador con archivo antiguo | Forzar recarga con Ctrl+Shift+R o abrir en incógnito |
| Error 502 al registrar | Flujo PA caído o conexión OneDrive expirada | Revisar historial del flujo en Power Automate |
| `asignarCodigo is not defined` | index.html viejo con JS embebido cargando junto al nuevo app.js | Reemplazar index.html en GitHub con la versión sin JS embebido |
| `POWER_AUTOMATE_URL already declared` | index.html viejo tiene la variable declarada + app.js también | Mismo que arriba: reemplazar index.html |
| Fecha desfasada 1 día | Timezone UTC-5 de Colombia afectaba `new Date()` | Resuelto usando algoritmo aritmético puro sin objeto Date |
| Campos `¿Cuál?` no se marcan obligatorios | Los radio buttons médicos no disparan el evento | Resuelto con listeners en `DOMContentLoaded` |

---

## 👨‍💻 Tecnologías utilizadas

- **HTML5 / CSS3 / JavaScript** — Vanilla, sin frameworks
- **Power Automate** — Automatización y conexión con Excel
- **Microsoft Excel Online / OneDrive** — Base de datos
- **GitHub Pages** — Hosting gratuito
- **jsPDF** — Generación de PDF en el cliente
- **SheetJS** — Exportación a Excel en el cliente
