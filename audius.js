const axios = require('axios');

// Dynamically get a working Audius discovery node
async function getDiscoveryNode() {
  try {
    const res = await axios.get('https://api.audius.co');
    return res.data.data[0]; // Return the first working node
  } catch (err) {
    console.error('Error fetching Audius discovery node:', err.message);
    throw new Error('Unable to get discovery node');
  }
}

// Search for a track using Audius API
async function searchAudiusTrack(query) {
  try {
    const node = await getDiscoveryNode();
    const response = await axios.get(`${node}/v1/tracks/search`, {
      params: {
        query,
        limit: 1
      }
    });

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
    console.error('Error fetching from Audius:', err.message);
    throw new Error('Error fetching track from Audius API');
  }
}

module.exports = { searchAudiusTrack };
