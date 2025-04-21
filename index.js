require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { searchAudiusTrack } = require('./audius');  // Import the Audius search function

const app = express();
app.use(express.static('public'));

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'YOUR_PAGE_ACCESS_TOKEN';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'myverifytoken';

app.use(bodyParser.json());
app.use(express.static(__dirname));

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

async function handleMessage(senderPsid, receivedMessage) {
  let response;

  if (receivedMessage.toLowerCase().startsWith('play ')) {
    const song = receivedMessage.substring(5);  // Extract song name
    try {
      const track = await searchAudiusTrack(song);  // Search for the track on Audius

      if (track) {
        // Send response with Audius track URL
        response = {
          text: `🎵 ${track.title} by ${track.artist}\n\nListen here: ${track.streamUrl}`
        };
        callSendAPI(senderPsid, response);
      } else {
        response = { text: "❌ Couldn't find that song on Audius." };
        callSendAPI(senderPsid, response);
      }
    } catch (err) {
      console.error('Audius error:', err);
      response = { text: 'Oops! Something went wrong.' };
      callSendAPI(senderPsid, response);
    }
  } else {
    response = { text: "Type 'play [song name]' to search for a song." };
    callSendAPI(senderPsid, response);
  }
}

function callSendAPI(senderPsid, response) {
  const requestBody = {
    recipient: { id: senderPsid },
    message: response,
  };

  axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, requestBody)
    .then(() => {
      console.log('✅ Message sent!');
    })
    .catch(err => {
      console.error('❌ Unable to send message:', err.response?.data || err.message);
    });
}

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`Webhook server is running on port ${PORT}`));
