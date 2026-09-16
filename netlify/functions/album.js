const { llamarSpotify } = require('./_utils');

exports.handler = async (event) => {
  const cabeceras = { 'Content-Type': 'application/json' };
  const id = event.queryStringParameters
    ? event.queryStringParameters.id
    : null;

  if (!id) {
    return {
      statusCode: 400,
      headers: cabeceras,
      body: JSON.stringify({ error: 'Falta el parámetro id' }),
    };
  }

  try {
    const album = await llamarSpotify(`/albums/${id}`);
    return {
      statusCode: 200,
      headers: cabeceras,
      body: JSON.stringify({
        nombre: album.name,
        artistas: album.artists.map((a) => a.name),
        fecha_lanzamiento: album.release_date,
        sello: album.label || 'no informado',
        imagen: album.images[0] ? album.images[0].url : null,
        tracks: album.tracks.items.map((t) => ({
          id: t.id,
          titulo: t.name,
          artistas: t.artists.map((a) => a.name),
          numero: t.track_number,
        })),
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: cabeceras,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
