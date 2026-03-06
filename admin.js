/* ══════════════════════════════════════════════
   CLUB CARIBE — Panel Administrador
   Requiere: jsPDF, SheetJS (xlsx)
══════════════════════════════════════════════ */

// ── URL del flujo de Power Automate para LISTAR registros ──
// Crea un nuevo flujo: Trigger HTTP → "Enumerar las filas de una tabla" → Respuesta con body(value)
const PA_LISTAR_URL = 'https://defaultb468904add5149289435b961241d32.77.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b2e8b902c13247c189ba5ca06229c726/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ofcWfmPhhwalhBntZJxojji4jF6KeUoqddIdtqS7168';

// ── URL del flujo unificado (inscripción/actualización) ya existente ──
const PA_REGISTRO_URL = "https://defaultb468904add5149289435b961241d32.77.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/af0ee7edcc7042f5881d4e0b8e376e4c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rmE7DqkZkiYNmdvaP2xKdZFnkhjjp2GH2rsXpK8q8lc";

/* ══ Estado ══ */
let registros      = [];
let filtrados      = [];
let seleccionado   = null;
let sortCol        = 'nombres_apellidos';
let sortDir        = 'asc';

/* ══ Helpers ══ */
const $  = id => document.getElementById(id);
const fmt = v  => (v && String(v).trim()) ? String(v).trim() : '—';

function fmtFecha(v) {
  if (!v || String(v).trim() === '') return '—';
  const s = String(v).trim();
  const n = parseInt(s);
  // Número serial de Excel: solo dígitos y valor típico de fechas Excel (>= 30000)
  if (s === String(n) && n >= 30000) {
    // Usar UTC para evitar desfase por zona horaria (Colombia UTC-5)
    const msUTC = Date.UTC(1899, 11, 30) + n * 86400000;
    const fecha = new Date(msUTC);
    const d = String(fecha.getUTCDate()).padStart(2,'0');
    const m = String(fecha.getUTCMonth()+1).padStart(2,'0');
    const y = fecha.getUTCFullYear();
    return d+'/'+m+'/'+y;
  }
  // yyyy-MM-dd
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y,m,d] = s.split('-');
    return d+'/'+m+'/'+y;
  }
  return s;
}

function showBanner(msg, type) {
  const b = $('banner');
  b.textContent = msg;
  b.className = `banner show ${type}`;
  if (type !== 'loading') setTimeout(() => b.classList.remove('show'), 4000);
}

function hideBanner() { $('banner').classList.remove('show'); }

/* ══ Cargar registros desde Power Automate ══ */
async function cargarRegistros() {
  mostrarCargando();
  try {
    if (PA_LISTAR_URL === 'PEGA_AQUI_URL_FLUJO_LISTAR') {
      // Modo demo — datos de ejemplo
      registros = datosDemo();
    } else {
      const res  = await fetch(PA_LISTAR_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await res.json();
      // El flujo devuelve { registros: [...] }
      registros  = (json.registros || json.value || []).map(limpiarRegistro);
    }
    filtrados = [...registros];
    actualizarStats();
    renderTabla();
    hideBanner();
  } catch(e) {
    console.error(e);
    mostrarError('No se pudieron cargar los registros. Verifica la URL del flujo de Power Automate.');
  }
}

function limpiarRegistro(r) {
  const clean = {};
  Object.keys(r).forEach(k => {
    const key = k.trim();
    if (key.startsWith('@') || key === 'ItemInternalId') return;
    clean[key] = typeof r[k] === 'string' ? r[k].trim() : r[k];
  });
  return clean;
}

/* ══ Stats ══ */
function actualizarStats() {
  $('stat-total').textContent  = registros.length;

  const cats = {};
  registros.forEach(r => {
    const c = r.categoria || 'Sin categoría';
    cats[c]  = (cats[c] || 0) + 1;
  });
  const topCat = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  $('stat-cat').textContent    = topCat ? topCat[0] : '—';
  $('stat-socios').textContent = registros.filter(r => r.socio === 'Si').length;

  // Categorías únicas para filtro
  const selectCat = $('filter-cat');
  const prev = selectCat.value;
  selectCat.innerHTML = '<option value="">Todas las categorías</option>';
  Object.keys(cats).sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    selectCat.appendChild(opt);
  });
  selectCat.value = prev;
}

/* ══ Tabla ══ */
function renderTabla() {
  const tbody = $('tbody');
  tbody.innerHTML = '';

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="state-box"><div class="icon">🔍</div><p>No se encontraron registros</p><p class="sub">Intenta con otro filtro o término de búsqueda</p></div>
    </td></tr>`;
    $('footer-count').textContent = '0 registros';
    return;
  }

  filtrados.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (seleccionado && seleccionado.identificacion === r.identificacion) tr.classList.add('selected');
    tr.innerHTML = `
      <td class="bold">${fmt(r.codigo)}</td>
      <td class="bold">${fmt(r.nombres_apellidos)}</td>
      <td>${fmt(r.tipo_documento)} ${fmt(r.identificacion)}</td>
      <td>${fmtFecha(r.fecha_nacimiento)}</td>
      <td><span class="badge badge-green">${fmt(r.categoria)}</span></td>
      <td>${fmt(r.rep1_celular)}</td>
      <td>${fmt(r.fecha_registro)}</td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" title="Ver detalle" onclick="verDetalle(${i})">👁️</button>
          <button class="btn-icon" title="Imprimir PDF" onclick="imprimirPDF(${i})">🖨️</button>
        </div>
      </td>`;
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.btn-icon')) return;
      seleccionado = r;
      document.querySelectorAll('tbody tr').forEach(t => t.classList.remove('selected'));
      tr.classList.add('selected');
    });
    tbody.appendChild(tr);
  });

  $('footer-count').textContent = `${filtrados.length} de ${registros.length} registros`;
}

/* ══ Búsqueda y filtros ══ */
function aplicarFiltros() {
  const q   = $('search').value.toLowerCase().trim();
  const cat = $('filter-cat').value;

  filtrados = registros.filter(r => {
    const matchQ = !q ||
      (r.nombres_apellidos||'').toLowerCase().includes(q) ||
      (r.identificacion||'').includes(q) ||
      (r.rep1_nombre||'').toLowerCase().includes(q) ||
      (r.codigo||'').toLowerCase().includes(q);
    const matchCat = !cat || r.categoria === cat;
    return matchQ && matchCat;
  });

  ordenar();
}

function ordenar() {
  filtrados.sort((a, b) => {
    const va = (a[sortCol] || '').toString().toLowerCase();
    const vb = (b[sortCol] || '').toString().toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  renderTabla();
}

function sortBy(col) {
  if (sortCol === col) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
  else { sortCol = col; sortDir = 'asc'; }
  document.querySelectorAll('th').forEach(th => th.classList.remove('sorted'));
  const thEl = document.querySelector(`th[data-col="${col}"]`);
  if (thEl) {
    thEl.classList.add('sorted');
    thEl.querySelector('.sort-icon').textContent = sortDir === 'asc' ? '↑' : '↓';
  }
  ordenar();
}

/* ══ Ver detalle ══ */
function verDetalle(idx) {
  const r = filtrados[idx];
  seleccionado = r;

  const sec = (title, fields) => `
    <div class="detail-section">
      <div class="detail-section-title">${title}</div>
      <div class="detail-grid">
        ${fields.map(([l,v]) => `<div class="detail-field"><span class="lbl">${l}</span><span class="val">${fmt(v)}</span></div>`).join('')}
      </div>
    </div>`;

  $('modal-content').innerHTML =
    sec('Identificación', [
      ['Código',r.codigo],['Socio',r.socio],['Tipo Doc.',r.tipo_documento],['Identificación',r.identificacion],
      ['Nombres y Apellidos',r.nombres_apellidos],['Sexo',r.sexo],['Fecha Nacimiento', fmtFecha(r.fecha_nacimiento)],
      ['Lugar Nacimiento',r.lugar_nacimiento],['Dirección',r.direccion],['Barrio',r.barrio],
      ['Jornada',r.jornada],['¿Dónde estudia?',r.donde_estudia],['Grado',r.grado],
    ]) +
    sec('Representante Principal', [
      ['Parentesco',r.rep1_parentesco],['Nombre',r.rep1_nombre],['Cédula',r.rep1_cedula],
      ['Celular',r.rep1_celular],['Tel. Fijo',r.rep1_telefono],['Profesión',r.rep1_profesion],['Correo',r.rep1_correo],
    ]) +
    (r.rep2_nombre ? sec('Segundo Representante', [
      ['Parentesco',r.rep2_parentesco],['Nombre',r.rep2_nombre],['Cédula',r.rep2_cedula],
      ['Celular',r.rep2_celular],['Correo',r.rep2_correo],
    ]) : '') +
    sec('Emergencia & Médico', [
      ['Contacto Emergencia',r.emergencia_nombre],['Tel. Emergencia',r.emergencia_telefono],
      ['Alergia',r.alergia],['¿Cuál?',r.alergia_cual],['Medicamento',r.medicamento],['¿Cuál?',r.medicamento_cual],
      ['Cirugía',r.cirugia],['¿Cuál?',r.cirugia_cual],['Lesiones',r.lesiones],['¿Cuál?',r.lesiones_cual],
      ['Asma',r.asma],['Enfermedades',r.enfermedades_actuales],['Rec. Especialista',r.recomendacion_especialista],['¿Cuál?',r.recomendacion_cual],
    ]) +
    sec('Béisbol', [
      ['Perfil',r.perfil],['Posición',r.posicion_juego],['Categoría',r.categoria],['Año Categoría',r.año_categoria],
    ]);

  $('modal').classList.add('open');
}

function cerrarModal() { $('modal').classList.remove('open'); }

/* ══ Imprimir PDF (reutiliza generatePDF del formulario) ══ */
function imprimirPDF(idx) {
  const r = filtrados[idx !== undefined ? idx : filtrados.indexOf(seleccionado)];
  if (!r) return;
  if (typeof generatePDF === 'function') {
    generatePDF(r, false);
  } else {
    alert('El generador de PDF no está disponible. Asegúrate de incluir app.js en la página.');
  }
}

function imprimirSeleccionado() {
  if (!seleccionado) { showBanner('Selecciona un pelotero primero.', 'error'); return; }
  imprimirPDF(filtrados.indexOf(seleccionado));
}

/* ══ Exportar a Excel (SheetJS) ══ */
function exportarExcel() {
  if (registros.length === 0) { showBanner('No hay registros para exportar.', 'error'); return; }
  showBanner('⏳ Generando Excel...', 'loading');

  const cols = [
    'codigo','socio','tipo_documento','identificacion','nombres_apellidos','sexo',
    'fecha_nacimiento','lugar_nacimiento','direccion','barrio','jornada','donde_estudia','grado',
    'otro_club','rep1_parentesco','rep1_nombre','rep1_cedula','rep1_celular','rep1_telefono','rep1_correo',
    'rep2_nombre','rep2_cedula','rep2_celular','rep2_correo',
    'emergencia_nombre','emergencia_telefono',
    'estatura','peso','tipo_sangre',
    'alergia','alergia_cual','medicamento','medicamento_cual','cirugia','cirugia_cual',
    'lesiones','lesiones_cual','asma','enfermedades_actuales','recomendacion_especialista','recomendacion_cual',
    'perfil','posicion_juego','categoria','año_categoria','fecha_registro'
  ];

  const headers = {
    codigo:'Código', socio:'Socio', tipo_documento:'Tipo Doc.', identificacion:'Identificación',
    nombres_apellidos:'Nombres y Apellidos', sexo:'Sexo', fecha_nacimiento:'Fecha Nacimiento',
    lugar_nacimiento:'Lugar Nacimiento', direccion:'Dirección', barrio:'Barrio',
    jornada:'Jornada', donde_estudia:'¿Dónde estudia?', grado:'Grado', otro_club:'¿Otro club?',
    rep1_parentesco:'Parentesco Rep.1', rep1_nombre:'Nombre Rep.1', rep1_cedula:'Cédula Rep.1',
    rep1_celular:'Celular Rep.1', rep1_telefono:'Tel. Rep.1', rep1_correo:'Correo Rep.1',
    rep2_nombre:'Nombre Rep.2', rep2_cedula:'Cédula Rep.2', rep2_celular:'Celular Rep.2', rep2_correo:'Correo Rep.2',
    emergencia_nombre:'Contacto Emergencia', emergencia_telefono:'Tel. Emergencia',
    estatura:'Estatura', peso:'Peso', tipo_sangre:'Tipo Sangre',
    alergia:'Alergia', alergia_cual:'¿Cuál alergia?', medicamento:'Medicamento', medicamento_cual:'¿Cuál medicamento?',
    cirugia:'Cirugía', cirugia_cual:'¿Cuál cirugía?', lesiones:'Lesiones', lesiones_cual:'¿Cuál lesión?',
    asma:'Asma', enfermedades_actuales:'Enfermedades', recomendacion_especialista:'Rec. Especialista', recomendacion_cual:'¿Cuál rec.?',
    perfil:'Perfil', posicion_juego:'Posición', categoria:'Categoría', año_categoria:'Año Cat.', fecha_registro:'Fecha Registro'
  };

  const data = [cols.map(c => headers[c] || c)];
  registros.forEach(r => data.push(cols.map(c => r[c] || '')));

  const ws = XLSX.utils.aoa_to_sheet(data);
  // Ancho de columnas
  ws['!cols'] = cols.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscripciones');
  XLSX.writeFile(wb, `ClubCaribe_Inscripciones_${new Date().getFullYear()}.xlsx`);
  showBanner('✅ Excel exportado correctamente.', 'success');
}

/* ══ Estados de UI ══ */
function mostrarCargando() {
  $('tbody').innerHTML = `<tr><td colspan="8">
    <div class="state-box"><div class="spinner"></div><p>Cargando registros desde OneDrive...</p></div>
  </td></tr>`;
}

function mostrarError(msg) {
  $('tbody').innerHTML = `<tr><td colspan="8">
    <div class="state-box"><div class="icon">⚠️</div><p>${msg}</p><p class="sub">Recarga la página o verifica la configuración.</p></div>
  </td></tr>`;
}

/* ══ Datos demo ══ */
function datosDemo() {
  return [
    { codigo:'2026-001', socio:'Si', tipo_documento:'TI', identificacion:'1138032490', nombres_apellidos:'NICOLAS MENCO AVILA', sexo:'Masculino', fecha_nacimiento:'2018-02-18', lugar_nacimiento:'MONTERIA', direccion:'MZ A LT 9', barrio:'SANTA ELENA 4', jornada:'AM', donde_estudia:'ANTONIO NARIÑO', grado:'3', categoria:'Pony', año_categoria:'2018', rep1_parentesco:'Padre', rep1_nombre:'CARLOS MENCO PEREZ', rep1_cedula:'1066514268', rep1_celular:'3216802879', rep1_correo:'carlos.menco@frigosinu.co', emergencia_nombre:'IRIS AVILA', emergencia_telefono:'3108253665', alergia:'No', medicamento:'No', cirugia:'No', lesiones:'No', asma:'No', recomendacion_especialista:'No', perfil:'Derecho', posicion_juego:'', fecha_registro:'5/3/2026' },
    { codigo:'2026-002', socio:'Si', tipo_documento:'TI', identificacion:'1002345678', nombres_apellidos:'JUAN PEREZ GARCIA', sexo:'Masculino', fecha_nacimiento:'2016-05-10', lugar_nacimiento:'MONTERIA', direccion:'CL 15 # 8-22', barrio:'LA CASTELLANA', jornada:'PM', donde_estudia:'SIMON BOLIVAR', grado:'5', categoria:'Preinfantil', año_categoria:'2016', rep1_parentesco:'Madre', rep1_nombre:'ANA GARCIA', rep1_cedula:'45678901', rep1_celular:'3101234567', rep1_correo:'ana.garcia@gmail.com', emergencia_nombre:'PEDRO PEREZ', emergencia_telefono:'3119876543', alergia:'Si', alergia_cual:'Polen', medicamento:'No', cirugia:'No', lesiones:'No', asma:'No', recomendacion_especialista:'No', perfil:'Zurdo', posicion_juego:'Lanzador', fecha_registro:'5/3/2026' },
  ];
}

/* ══ Init ══ */
document.addEventListener('DOMContentLoaded', () => {
  cargarRegistros();

  $('search').addEventListener('input', aplicarFiltros);
  $('filter-cat').addEventListener('change', aplicarFiltros);

  // Sort headers
  document.querySelectorAll('th[data-col]').forEach(th => {
    th.addEventListener('click', () => sortBy(th.dataset.col));
  });

  // Close modal on overlay click
  $('modal').addEventListener('click', e => {
    if (e.target === $('modal')) cerrarModal();
  });
});
