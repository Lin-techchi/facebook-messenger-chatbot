const axios = require('axios');

// Your Spotify API credentials (from the developer dashboard)
const SPOTIFY_API_URL = 'https://api.spotify.com/v1/search';

// Fetch the access token from Spotify
async function getSpotifyAccessToken() {
  const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.access_token;
  } catch (err) {
    console.error('❌ Error fetching access token:', err.response?.data || err.message);
    throw err;
  }
}

// Function to search for tracks
async function searchTracks(query) {
  try {
    const accessToken = await getSpotifyAccessToken();

    const response = await axios.get(SPOTIFY_API_URL, {
      params: {
        q: query,
        type: 'track',
        limit: 1,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const items = response.data.tracks.items;

    console.log('🔎 Spotify search results:', items);

    if (items.length > 0) {
      const track = items[0];
      if (!track.preview_url) {
        console.warn('⚠️ Found a track, but no preview URL is available.');
      }
      return track;
    } else {
      console.warn('❗ No tracks found for query:', query);
      return null;
    }
  } catch (err) {
    console.error('❌ Error fetching track:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { searchTracks };
