const { llamarSpotify } = require('./_utils');

async function obtenerISRCsDeTracks(trackIds) {
  const resultados = await Promise.all(
    trackIds.map(id => llamarSpotify(`/tracks/${id}`).catch(() => null))
  );
  return resultados.map(t => (t && t.external_ids) ? t.external_ids.isrc : null);
}

exports.handler = async (event) => {
  const cabeceras = { 'Content-Type': 'application/json' };
  const id = event.queryStringParameters ? event.queryStringParameters.id : null;

  if (!id) {
    return { statusCode: 400, headers: cabeceras, body: JSON.stringify({ error: 'Falta el parámetro id' }) };
  }

  try {
    const album = await llamarSpotify(`/albums/${id}`);
    const isrcs = await obtenerISRCsDeTracks(album.tracks.items.map(t => t.id));

    return {
      statusCode: 200,
      headers: cabeceras,
      body: JSON.stringify({
        nombre: album.name,
        artistas: album.artists.map(a => a.name),
        fecha_lanzamiento: album.release_date,
        sello: album.label || 'no informado',
        imagen: album.images[0] ? album.images[0].url : null,
        tracks: album.tracks.items.map((t, i) => ({
          id: t.id,
          titulo: t.name,
          artistas: t.artists.map(a => a.name),
          numero: t.track_number,
          isrc: isrcs[i] || 'no informado'
        }))
      })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers: cabeceras, body: JSON.stringify({ error: error.message }) };
  }
};
