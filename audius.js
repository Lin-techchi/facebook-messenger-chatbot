const axios = require('axios');

// Function to search tracks from Audius
async function searchAudiusTrack(query) {
    try {
      const response = await axios.get(AUDIUS_API_URL, {
        params: {
          query,   // the song name you want to search for
          limit: 1  // limit results to 1 track
        }
      });
  
      const tracks = response.data.data;
  
      // If we find a track, return relevant data
      if (tracks.length > 0) {
        const track = tracks[0];  // Get the first track result
        return {
          title: track.title,
          artist: track.user.name,
          streamUrl: track.permalink  // URL to the full track
        };
      } else {
        return null;  // No track found
      }
    } catch (err) {
      console.error('Error fetching from Audius:', err);
      throw err;  // Propagate error if any
    }
  }
  
