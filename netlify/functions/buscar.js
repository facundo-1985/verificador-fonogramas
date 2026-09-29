const { llamarSpotify, formatearTrackResumen, formatearAlbumResumen, formatearArtistaResumen } = require('./_utils');

// Si escriben varios artistas combinados (con guión, coma, "y", "&", "feat", etc.),
// nos quedamos solo con el primero: alcanza con uno para que Spotify encuentre el álbum,
// y evita que separadores como el guión se interpreten como "excluir" en la búsqueda.
function primerArtista(texto) {
  return texto.split(/\s*(?:-|,|\/|&| y | feat\.?| ft\.?)\s*/i)[0].trim();
}

// Cada track que devuelve Spotify ya trae adentro los datos de su álbum.
// De ahí armamos la lista de álbumes, sin pedirle nada extra a Spotify,
// así aparecen siempre, sin importar cómo se haya buscado.
function derivarAlbumesDeTracks(tracksRaw) {
  const vistos = new Map();
  tracksRaw.forEach(t => {
    if (t.album && !vistos.has(t.album.id)) {
      vistos.set(t.album.id, formatearAlbumResumen(t.album));
    }
  });
  return Array.from(vistos.values());
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const artista = primerArtista((params.artista || '').trim());
  const interpretacion = (params.interpretacion || '').trim();
  const album = (params.album || '').trim();
  const isrc = (params.isrc || '').trim();

  const cabeceras = { 'Content-Type': 'application/json' };

  if (!artista && !interpretacion && !album && !isrc) {
    return { statusCode: 400, headers: cabeceras, body: JSON.stringify({ error: 'Completá al menos un campo de búsqueda' }) };
  }

  try {
    if (isrc) {
      const esISRC = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i.test(isrc);
      if (!esISRC) {
        return { statusCode: 400, headers: cabeceras, body: JSON.stringify({ error: 'El ISRC no tiene un formato válido (ej: ARXXX2400001)' }) };
      }

      const partes = [`isrc:${isrc.toUpperCase()}`];
      if (artista) partes.push(`artist:"${artista}"`);
      if (interpretacion) partes.push(`track:"${interpretacion}"`);
      if (album) partes.push(`album:"${album}"`);

      const datos = await llamarSpotify(`/search?q=${encodeURIComponent(partes.join(' '))}&type=track&limit=10`);
      const resultados = datos.tracks.items.map(formatearTrackResumen);
      const albumsDerivados = derivarAlbumesDeTracks(datos.tracks.items);
      return { statusCode: 200, headers: cabeceras, body: JSON.stringify({ modo: 'isrc', tracks: resultados, albums: albumsDerivados, artists: [] }) };
    }

    const partes = [];
    if (artista) partes.push(`artist:"${artista}"`);
    if (interpretacion) partes.push(`track:"${interpretacion}"`);
    if (album) partes.push(`album:"${album}"`);

    const datos = await llamarSpotify(
      `/search?q=${encodeURIComponent(partes.join(' '))}&type=track,album,artist&limit=8`
    );

    const tracksRaw = datos.tracks ? datos.tracks.items : [];

    // Combinamos los álbumes que Spotify encontró directamente con los derivados
    // de los tracks encontrados, sin repetir ninguno (por id)
    const mapaAlbums = new Map();
    (datos.albums ? datos.albums.items : []).forEach(a => mapaAlbums.set(a.id, formatearAlbumResumen(a)));
    derivarAlbumesDeTracks(tracksRaw).forEach(a => { if (!mapaAlbums.has(a.id)) mapaAlbums.set(a.id, a); });

    return {
      statusCode: 200,
      headers: cabeceras,
      body: JSON.stringify({
        modo: 'texto',
        tracks: tracksRaw.map(formatearTrackResumen),
        albums: Array.from(mapaAlbums.values()),
        artists: (datos.artists ? datos.artists.items : []).map(formatearArtistaResumen)
      })
    };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers: cabeceras, body: JSON.stringify({ error: error.message }) };
  }
};
