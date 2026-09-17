const formulario = document.getElementById('formulario');
const resultadoDiv = document.getElementById('resultado');
const pilaHTML = [];

function volver() {
  if (pilaHTML.length > 0) {
    resultadoDiv.innerHTML = pilaHTML.pop();
  } else {
    resultadoDiv.innerHTML = '';
  }
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();

  const artista = document.getElementById('artista').value.trim();
  const interpretacion = document.getElementById('interpretacion').value.trim();
  const album = document.getElementById('album').value.trim();
  const isrc = document.getElementById('isrc').value.trim();

  if (!artista && !interpretacion && !album && !isrc) {
    mostrarError('Completá al menos un campo para buscar');
    return;
  }

  formulario.reset();
  mostrarCargando();

  const parametros = new URLSearchParams({ artista, interpretacion, album, isrc });

  try {
    const respuesta = await fetch(`/.netlify/functions/buscar?${parametros.toString()}`);
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarError(datos.error);
      return;
    }

    if (datos.modo === 'isrc' && datos.tracks.length > 0) {
      mostrarDetalleTrack(datos.tracks[0].id);
      return;
    }

    mostrarResultadosBusqueda(datos);

  } catch (error) {
    mostrarError('Error de conexión con el servidor');
  }
});

function mostrarCargando() {
  resultadoDiv.innerHTML = '<p class="cargando">Consultando...</p>';
}

function mostrarError(mensaje) {
  resultadoDiv.innerHTML = `<p class="error">${mensaje}</p>`;
}

function mostrarResultadosBusqueda(datos) {
  const total = datos.tracks.length + datos.albums.length + datos.artists.length;

  if (total === 0) {
    mostrarError('No se encontraron coincidencias en Spotify');
    return;
  }

  let html = '';

  if (datos.tracks.length > 0) {
    html += '<h3>Tracks</h3><div class="lista">';
    datos.tracks.forEach(t => {
      html += itemLista(t.imagen, t.titulo, `${t.artistas.join(', ')} · ${t.album} · ${t.anio}`, `mostrarDetalleTrack('${t.id}')`);
    });
    html += '</div>';
  }

  if (datos.albums.length > 0) {
    html += '<h3>Álbumes / Singles</h3><div class="lista">';
    datos.albums.forEach(a => {
      html += itemLista(a.imagen, a.nombre, `${a.artistas.join(', ')} · ${a.tipo} · ${a.anio}`, `mostrarTracksAlbum('${a.id}')`);
    });
    html += '</div>';
  }

  if (datos.artists.length > 0) {
    html += '<h3>Artistas</h3><div class="lista">';
    datos.artists.forEach(ar => {
      html += itemLista(ar.imagen, ar.nombre, ar.generos.join(', ') || 'sin géneros informados', `mostrarAlbumesArtista('${ar.id}', '${ar.nombre.replace(/'/g, "\\'")}')`);
    });
    html += '</div>';
  }

  resultadoDiv.innerHTML = html;
}

function itemLista(imagen, titulo, subtitulo, onclick) {
  return `
    <div class="item-lista" onclick="${onclick}">
      ${imagen ? `<img src="${imagen}" alt="">` : '<div class="sin-imagen"></div>'}
      <div>
        <strong>${titulo}</strong>
        <p>${subtitulo}</p>
      </div>
    </div>
  `;
}

async function mostrarTracksAlbum(albumId) {
  pilaHTML.push(resultadoDiv.innerHTML);
  mostrarCargando();
  try {
    const respuesta = await fetch(`/.netlify/functions/album?id=${albumId}`);
    const album = await respuesta.json();

    if (!respuesta.ok) {
      mostrarError(album.error);
      return;
    }

    let html = `
      <button class="volver" onclick="volver()">&larr; Volver</button>
      <div class="cabecera-album">
        ${album.imagen ? `<img src="${album.imagen}" alt="">` : ''}
        <div>
          <strong>${album.nombre}</strong>
          <p>${album.artistas.join(', ')} · ${album.fecha_lanzamiento}</p>
          <p>Sello: ${album.sello}</p>
        </div>
      </div>
      <div class="fila-titulo-copiar">
        <h3>Tracks e ISRC</h3>
        <button class="copiar" onclick="copiarISRCs(this)">Copiar todos los ISRC</button>
      </div>
      <div class="lista-isrc" id="lista-isrc">
    `;

    album.tracks.forEach(t => {
      html += `
        <div class="fila-track" data-isrc="${t.isrc}">
          <span class="num">${t.numero}.</span>
          <span class="titulo-track" onclick="mostrarDetalleTrack('${t.id}')">${t.titulo}</span>
          <span class="isrc-track">${t.isrc}</span>
          <button class="copiar-uno" title="Copiar este ISRC" onclick="event.stopPropagation(); copiarISRCIndividual(this, '${t.isrc}')">📋</button>
        </div>
      `;
    });

    html += '</div>';
    resultadoDiv.innerHTML = html;

  } catch (error) {
    mostrarError('Error de conexión con el servidor');
  }
}

function copiarISRCIndividual(boton, isrc) {
  if (!isrc || isrc === 'no informado') return;

  navigator.clipboard.writeText(isrc).then(() => {
    const textoOriginal = boton.textContent;
    boton.textContent = '✅';
    setTimeout(() => { boton.textContent = textoOriginal; }, 1000);
  }).catch(() => {
    alert('No se pudo copiar. ISRC: ' + isrc);
  });
}

function copiarISRCs(boton) {
  const filas = document.querySelectorAll('#lista-isrc .fila-track');
  const lineas = Array.from(filas).map(f => f.dataset.isrc).filter(isrc => isrc && isrc !== 'no informado');
  const texto = lineas.join('\n');

  navigator.clipboard.writeText(texto).then(() => {
    const textoOriginal = boton.textContent;
    boton.textContent = '¡Copiado!';
    setTimeout(() => { boton.textContent = textoOriginal; }, 1500);
  }).catch(() => {
    alert('No se pudo copiar automáticamente. Seleccioná y copiá manualmente:\n\n' + texto);
  });
}

async function mostrarAlbumesArtista(artistaId, nombreArtista) {
  pilaHTML.push(resultadoDiv.innerHTML);
  mostrarCargando();
  try {
    const respuesta = await fetch(`/.netlify/functions/artista-albumes?id=${artistaId}`);
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarError(datos.error);
      return;
    }

    let html = `
      <button class="volver" onclick="volver()">&larr; Volver</button>
      <h3>Discografía de ${nombreArtista}</h3>
      <div class="lista">
    `;

    datos.albumes.forEach(a => {
      html += itemLista(a.imagen, a.nombre, `${a.tipo} · ${a.anio}`, `mostrarTracksAlbum('${a.id}')`);
    });

    html += '</div>';
    resultadoDiv.innerHTML = html;

  } catch (error) {
    mostrarError('Error de conexión con el servidor');
  }
}

async function mostrarDetalleTrack(trackId) {
  pilaHTML.push(resultadoDiv.innerHTML);
  mostrarCargando();
  try {
    const respuesta = await fetch(`/.netlify/functions/track?id=${trackId}`);
    const t = await respuesta.json();

    if (!respuesta.ok) {
      mostrarError(t.error);
      return;
    }

    let htmlCreditos = '';
    if (t.creditos_musicbrainz.disponible && t.creditos_musicbrainz.creditos.length > 0) {
      htmlCreditos = `
        <h3>Créditos (MusicBrainz)</h3>
        <div class="lista">
          ${t.creditos_musicbrainz.creditos.map(c => `
            <div class="item-credito">
              <strong>${c.nombre}</strong>
              <span>${c.rol}</span>
            </div>
          `).join('')}
        </div>
        <p class="nota">Fuente comunitaria (MusicBrainz), no oficial — puede estar incompleta.</p>
      `;
    } else {
      htmlCreditos = `<p class="nota">Créditos: ${t.creditos_musicbrainz.mensaje || 'no disponibles'}</p>`;
    }

    resultadoDiv.innerHTML = `
      <button class="volver" onclick="volver()">&larr; Volver</button>
      <div class="tarjeta">
        ${t.imagen ? `<img src="${t.imagen}" alt="Portada">` : ''}
        <div class="datos">
          <strong>${t.titulo}</strong>
          <p>ISRC: <span class="isrc-track">${t.isrc || 'no informado'}</span> ${t.isrc ? `<button class="copiar-uno" title="Copiar ISRC" onclick="copiarISRCIndividual(this, '${t.isrc}')">📋</button>` : ''}</p>
          <p>Artistas: ${t.artistas.join(', ')}</p>
          <p>Álbum: ${t.album} (${t.tipo_album})</p>
          <p>Sello: ${t.sello}</p>
          <p>Fecha de lanzamiento: ${t.fecha_lanzamiento}</p>
          <p>Duración: ${Math.round(t.duracion_ms / 1000 / 60 * 100) / 100} min</p>
          <p>Explícito: ${t.explicito ? 'Sí' : 'No'}</p>
          <p>Popularidad: ${t.popularidad}/100</p>
          <p>Mercados disponibles: ${t.mercados_disponibles}</p>
          <p><a href="${t.url_spotify}" target="_blank">Escuchar en Spotify</a></p>
        </div>
      </div>
      ${htmlCreditos}
    `;

  } catch (error) {
    mostrarError('Error de conexión con el servidor');
  }
}
