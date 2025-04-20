require('dotenv').config();
const axios = require('axios');

const SPOTIFY_API_URL = 'https://api.spotify.com/v1/search';

// Fetch the access token from Spotify
async function getSpotifyAccessToken() {
  const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');

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

// Function to search for tracks with a preview
async function searchTracks(query) {
  try {
    const accessToken = await getSpotifyAccessToken();

    const response = await axios.get(SPOTIFY_API_URL, {
      params: {
        q: query,
        type: 'track',
        limit: 10, // increase limit to find a track with a preview
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const items = response.data.tracks.items;

    console.log('🔎 Spotify search results:', items.map(item => ({
      name: item.name,
      artist: item.artists[0].name,
      preview_url: item.preview_url
    })));

    const trackWithPreview = items.find(track => track.preview_url);

    if (trackWithPreview) {
      return trackWithPreview;
    } else {
      console.warn('❗ No tracks with preview found for query:', query);
      return null;
    }
  } catch (err) {
    console.error('❌ Error fetching track:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { searchTracks };
