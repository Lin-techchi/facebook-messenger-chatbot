require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { searchAudiusTrack } = require('./audius');

const app = express();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'YOUR_PAGE_ACCESS_TOKEN';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'myverifytoken';

app.use(bodyParser.json());

// Verify the webhook
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

// Handle incoming messages
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

// Handle the actual message
async function handleMessage(senderPsid, receivedMessage) {
  if (receivedMessage.toLowerCase().startsWith('play ')) {
    const song = receivedMessage.substring(5);  // Extract song name after "play "

    try {
      const track = await searchAudiusTrack(song);  // Call the Audius API to search for the track

      if (track) {
        // If track found, send a response with title, artist, and link to Audius
        const response = {
          text: `🎵 ${track.title} by ${track.artist}\n\nListen here: ${track.streamUrl}`
        };
        callSendAPI(senderPsid, response);  // Send the response to the user
      } else {
        // If no track found, inform the user
        callSendAPI(senderPsid, { text: "❌ Couldn't find that song on Audius." });
      }
    } catch (err) {
      console.error('Audius error:', err);  // Log any errors
      callSendAPI(senderPsid, { text: 'Oops! Something went wrong.' });  // Handle errors gracefully
    }
  }
}

// Send the response to the user on Facebook Messenger
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
