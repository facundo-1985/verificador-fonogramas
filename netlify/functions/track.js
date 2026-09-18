const { llamarSpotify } = require('./_utils');

exports.handler = async (event) => {
  const cabeceras = { 'Content-Type': 'application/json' };
  const id = event.queryStringParameters ? event.queryStringParameters.id : null;

  if (!id) {
    return { statusCode: 400, headers: cabeceras, body: JSON.stringify({ error: 'Falta el parámetro id' }) };
  }

  try {
    const track = await llamarSpotify(`/tracks/${id}`);
    const album = await llamarSpotify(`/albums/${track.album.id}`);

    return {
      statusCode: 200,
      headers: cabeceras,
      body: JSON.stringify({
        isrc: track.external_ids ? track.external_ids.isrc : null,
        titulo: track.name,
        artistas: track.artists.map(a => a.name),
        album: track.album.name,
        tipo_album: album.album_type,
        fecha_lanzamiento: track.album.release_date,
        sello: album.label || 'no informado',
        duracion_ms: track.duration_ms,
        explicito: track.explicit,
        popularidad: track.popularity,
        mercados_disponibles: track.available_markets ? track.available_markets.length : 'no informado',
        url_spotify: track.external_urls.spotify,
        imagen: track.album.images[0] ? track.album.images[0].url : null
      })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers: cabeceras, body: JSON.stringify({ error: error.message }) };
  }
};
