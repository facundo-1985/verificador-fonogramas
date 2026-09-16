// Este archivo no es una función en sí (el guión bajo al inicio hace que Netlify lo ignore
// como endpoint) — es código compartido que importan las demás funciones.

let spotifyToken = null;
let tokenExpira = 0;

async function obtenerTokenSpotify() {
  const ahora = Date.now();
  if (spotifyToken && ahora < tokenExpira) {
    return spotifyToken;
  }

  const credenciales = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const respuesta = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credenciales}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      `Error al obtener token de Spotify: ${JSON.stringify(datos)}`
    );
  }

  spotifyToken = datos.access_token;
  tokenExpira = ahora + (datos.expires_in - 60) * 1000;

  return spotifyToken;
}

async function llamarSpotify(endpoint) {
  const token = await obtenerTokenSpotify();
  const respuesta = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(
      datos.error ? datos.error.message : 'Error consultando Spotify'
    );
  }
  return datos;
}

async function obtenerCreditosMusicBrainz(isrc) {
  const cabeceras = {
    'User-Agent': 'ISRC-Checker-AADI/1.0 ( contacto@ejemplo.com )',
  };

  try {
    const respuestaISRC = await fetch(
      `https://musicbrainz.org/ws/2/isrc/${isrc}?fmt=json`,
      { headers: cabeceras }
    );
    const datosISRC = await respuestaISRC.json();

    if (!datosISRC.recordings || datosISRC.recordings.length === 0) {
      return {
        disponible: false,
        mensaje: 'ISRC no encontrado en MusicBrainz',
        creditos: [],
      };
    }

    const mbid = datosISRC.recordings[0].id;

    const respuestaGrabacion = await fetch(
      `https://musicbrainz.org/ws/2/recording/${mbid}?fmt=json&inc=artist-credits+artist-rels`,
      { headers: cabeceras }
    );
    const grabacion = await respuestaGrabacion.json();

    const creditos = (grabacion.relations || [])
      .filter((r) => r['target-type'] === 'artist')
      .map((r) => ({
        nombre: r.artist ? r.artist.name : 'desconocido',
        rol:
          r.type +
          (r.attributes && r.attributes.length
            ? ` (${r.attributes.join(', ')})`
            : ''),
      }));

    return {
      disponible: true,
      creditos,
      mensaje:
        creditos.length === 0
          ? 'Se encontró la grabación pero sin créditos detallados cargados'
          : null,
    };
  } catch (error) {
    return {
      disponible: false,
      mensaje: 'Error consultando MusicBrainz',
      creditos: [],
    };
  }
}

function formatearTrackResumen(t) {
  return {
    id: t.id,
    titulo: t.name,
    artistas: t.artists.map((a) => a.name),
    album: t.album.name,
    anio: t.album.release_date ? t.album.release_date.slice(0, 4) : '',
    imagen: t.album.images[2]
      ? t.album.images[2].url
      : t.album.images[0]
      ? t.album.images[0].url
      : null,
  };
}

function formatearAlbumResumen(a) {
  return {
    id: a.id,
    nombre: a.name,
    artistas: a.artists.map((art) => art.name),
    tipo: a.album_type,
    anio: a.release_date ? a.release_date.slice(0, 4) : '',
    imagen: a.images[2]
      ? a.images[2].url
      : a.images[0]
      ? a.images[0].url
      : null,
  };
}

function formatearArtistaResumen(ar) {
  return {
    id: ar.id,
    nombre: ar.name,
    generos: ar.genres || [],
    imagen:
      ar.images && ar.images[2]
        ? ar.images[2].url
        : ar.images && ar.images[0]
        ? ar.images[0].url
        : null,
  };
}

module.exports = {
  llamarSpotify,
  obtenerCreditosMusicBrainz,
  formatearTrackResumen,
  formatearAlbumResumen,
  formatearArtistaResumen,
};
