const axios = require('axios');

// Define Audius API endpoint
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
        throw new Error('Error fetching track from Audius API');  // Propagate error with custom message
    }
}

module.exports = { searchAudiusTrack };
