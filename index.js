const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const { searchTracks } = require('./spotify'); // Import the search function for Spotify

const app = express();
app.use(express.static('public'));

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'EAAOUTb7FiWYBO8RbFhLdFOPJZApDV6lBA4ePyYiPL5iVuNM3Bmyv5QaMuVkrseclE5wHXt9ZAw8CS48sQZB98Q1aDYBVywM0hYUrpmIhQxulaZAaDRj1hGukqlkeGTt8LsdweKZCgHew7ai4PwdtnU5xazBOz2lNHNk1RHO17d6OlMBxDf6ZCFhhFlQlOXCZBtBwaCfOC9qRKZAZAuu2yW1sllSZBWF6cZD';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'myverifytoken';

app.use(bodyParser.json());
app.use(express.static(__dirname));

// ✅ Webhook Verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified!');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// ✅ Handle Incoming Messages (POST)
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      const senderPsid = webhookEvent.sender.id;

      if (webhookEvent.message && webhookEvent.message.text) {
        const receivedMessage = webhookEvent.message.text;
        handleMessage(senderPsid, receivedMessage);
      }
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// ✅ Handle the message logic
async function handleMessage(senderPsid, receivedMessage) {
  let response;

  if (receivedMessage.toLowerCase().startsWith('play ')) {
    const song = receivedMessage.substring(5); // Extract the song name
    const query = encodeURIComponent(song);

    try {
      // Search for the song on Spotify
      const track = await searchTracks(query);

      if (track) {
        // If a song is found, create a message with album art, buttons, and links
        response = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [{
                title: `${track.name} by ${track.artists[0].name}`,
                image_url: track.album.images[0].url,
                subtitle: 'Tap below to play preview or open in Spotify',
                buttons: [
                  {
                    type: 'web_url',
                    url: track.external_urls.spotify,
                    title: 'Open in Spotify',
                  },
                  {
                    type: 'web_url',
                    url: track.preview_url,
                    title: 'Play Preview',
                  },
                ],
              }],
            },
          },
        };
      } else {
        response = { text: "Sorry, I couldn't find that song." };
      }
    } catch (err) {
      console.error('Error searching for song:', err);
      response = { text: "Sorry, I couldn't find that song." };
    }
  } else {
    response = { text: "Type 'play [song name]' to search for a song." };
  }

  // Send the response back to the user
  callSendAPI(senderPsid, response);
}

// ✅ Send response back to Facebook Messenger
function callSendAPI(senderPsid, response) {
  const requestBody = {
    recipient: { id: senderPsid },
    message: response,
  };

  request({
    uri: 'https://graph.facebook.com/v18.0/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: requestBody,
  }, (err, res, body) => {
    if (!err) {
      console.log('✅ Message sent!');
    } else {
      console.error('❌ Unable to send message:', err);
    }
  });
}

// ✅ Start the server
const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`Webhook server is running on port ${PORT}`));
