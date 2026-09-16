const { llamarSpotify, formatearAlbumResumen } = require('./_utils');

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
    const datos = await llamarSpotify(
      `/artists/${id}/albums?limit=20&include_groups=album,single`
    );
    return {
      statusCode: 200,
      headers: cabeceras,
      body: JSON.stringify({ albumes: datos.items.map(formatearAlbumResumen) }),
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
