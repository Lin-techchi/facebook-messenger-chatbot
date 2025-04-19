require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const { searchTracks } = require('./spotify'); // Import the search function for Spotify

const app = express();
app.use(express.static('public'));

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'EAAOUTb7FiWYBOxhBYvKQQ7jZBT1wmMwWR1GAe4tZCXqb4OCcyrB2rgB24RvhQZBu9rZBsGCI9TeriaV0qgoqc51sXeKI6vAkDfrzB0GXrjP8jnRZC6ZCuiSktbaAFrN3NmYhQtsqapbJ5C0kxGtZAWXHUQ6CDdunmeZAnQDdFNtt7qeVZAGdYpHJa4U8hfwyUJZCtq';
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
        // If a song is found and has a preview URL
        if (track.preview_url) {
          // Send audio preview as an attachment (like a voice message)
          response = {
            recipient: { id: senderPsid },
            message: {
              attachment: {
                type: 'audio',
                payload: {
                  url: track.preview_url,
                  is_reusable: true,
                },
              },
            },
          };
        } else {
          response = { text: `Found "${track.name}", but no preview is available.` };
        }
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
  const axios = require('axios');

  axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, requestBody)
    .then(() => {
      console.log('✅ Message sent!');
    })
    .catch(err => {
      console.error('❌ Unable to send message:', err.response?.data || err.message);
    });
  
}

// ✅ Start the server
const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`Webhook server is running on port ${PORT}`));
