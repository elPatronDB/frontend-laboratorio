const BASE_URL = 'https://backend-laboratorio-arquitectura-de.onrender.com';
const API_URL = `${BASE_URL}/api/mensaje`;

const btnConsultar = document.getElementById('consultar');
const resultadoPre = document.getElementById('resultado');
const gridPresets = document.getElementById('grid-presets');
const contadorPresets = document.getElementById('contador-presets');
const formPreset = document.getElementById('form-preset');
const estadoFormulario = document.getElementById('estado-formulario');
const ledOnline = document.getElementById('led-online');
const badgeEstado = document.getElementById('badge-estado');

function escaparHtml(texto) {
  if (!texto) return '';
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function renderizarCadenaAudio(cadena) {
  if (!cadena) return '';
  const bloques = cadena
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  return bloques
    .map((bloque) => `<span class="signal-tag">${escaparHtml(bloque)}</span>`)
    .join('');
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '';
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) return fechaIso;
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function renderizarPresets(lista = []) {
  contadorPresets.textContent = String(lista.length);

  if (lista.length === 0) {
    gridPresets.innerHTML = `
      <div class="empty-state">
        <p>No hay presets registrados en la base de datos.</p>
        <small>Usa el formulario para crear el primer preset de audio.</small>
      </div>
    `;
    return;
  }

  gridPresets.innerHTML = lista
    .map(
      (preset) => `
      <article class="preset-item">
        <div>
          <div class="preset-header">
            <h3 class="preset-song">${escaparHtml(preset.cancion)}</h3>
            <span class="preset-style-badge">${escaparHtml(preset.estilo || 'General')}</span>
          </div>
          <div class="signal-tags" style="margin-top: 0.65rem;">
            ${renderizarCadenaAudio(preset.cadena_audio)}
          </div>
          ${
            preset.notas
              ? `<p class="preset-notes" style="margin-top: 0.65rem;">${escaparHtml(preset.notas)}</p>`
              : ''
          }
        </div>
        <div class="preset-footer">
          <span>ID #${escaparHtml(String(preset.id))} &bull; ${escaparHtml(formatearFecha(preset.fecha))}</span>
          <button
            type="button"
            class="btn-delete"
            data-id="${escaparHtml(String(preset.id))}"
          >
            Eliminar
          </button>
        </div>
      </article>
    `
    )
    .join('');
}

async function consultarAPI() {
  resultadoPre.textContent = 'Consultando...';
  btnConsultar.disabled = true;

  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const datos = await respuesta.json();

    // Evidencia obligatoria de la guía en <pre id="resultado">
    resultadoPre.textContent = JSON.stringify(datos, null, 2);

    // Renderizado visual en #grid-presets
    renderizarPresets(datos.presets || []);

    ledOnline.classList.remove('offline');
    badgeEstado.textContent = 'ONLINE // CONECTADO';
  } catch (error) {
    resultadoPre.textContent = 'No se pudo consultar la API: ' + error.message;
    ledOnline.classList.add('offline');
    badgeEstado.textContent = 'ERROR DE CONEXIÓN';
  } finally {
    btnConsultar.disabled = false;
  }
}

btnConsultar.addEventListener('click', consultarAPI);

formPreset.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const btnGuardar = document.getElementById('btn-guardar');
  const payload = {
    cancion: document.getElementById('cancion').value.trim(),
    estilo: document.getElementById('estilo').value.trim(),
    cadena_audio: document.getElementById('cadena_audio').value.trim(),
    notas: document.getElementById('notas').value.trim()
  };

  btnGuardar.disabled = true;
  estadoFormulario.className = 'form-feedback';
  estadoFormulario.textContent = 'Guardando preset en PostgreSQL...';

  try {
    const respuesta = await fetch(`${BASE_URL}/api/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    formPreset.reset();
    estadoFormulario.textContent = '✓ Preset guardado exitosamente.';
    await consultarAPI();
  } catch (error) {
    estadoFormulario.className = 'form-feedback error';
    estadoFormulario.textContent = 'Error al guardar: ' + error.message;
  } finally {
    btnGuardar.disabled = false;
  }
});

gridPresets.addEventListener('click', async (evento) => {
  const botonEliminar = evento.target.closest('.btn-delete');
  if (!botonEliminar) return;

  const id = botonEliminar.getAttribute('data-id');
  if (!id) return;

  botonEliminar.disabled = true;
  botonEliminar.textContent = '...';

  try {
    const respuesta = await fetch(`${BASE_URL}/api/presets/${id}`, {
      method: 'DELETE'
    });

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    await consultarAPI();
  } catch (error) {
    alert('No se pudo eliminar el preset: ' + error.message);
    botonEliminar.disabled = false;
    botonEliminar.textContent = 'Eliminar';
  }
});
