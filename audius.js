const axios = require('axios');

const AUDIUS_API_URL = 'https://discoveryprovider.audius.io/v1/tracks/search';

// Function to search tracks from Audius
async function searchAudiusTrack(query) {
  try {
    const response = await axios.get(AUDIUS_API_URL, {
      params: {
        query,   // The song name you want to search for
        limit: 1  // Limit results to 1 track
      }
    });

    console.log('Audius API Response:', response.data);  // Log the entire response for debugging

    const tracks = response.data.data;

    if (tracks.length > 0) {
      const track = tracks[0];
      return {
        title: track.title,
        artist: track.user.name,
        streamUrl: track.permalink
      };
    } else {
      return null;
    }
  } catch (err) {
    console.error('Error fetching from Audius:', err);
    throw new Error('Error fetching track from Audius API');
  }
}

module.exports = { searchAudiusTrack };
