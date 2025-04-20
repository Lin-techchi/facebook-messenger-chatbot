require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { searchTracks } = require('./itunes');  // Import the iTunes search function

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
    const query = encodeURIComponent(song);  // Encode the song name

    try {
      const track = await searchTracks(query);

      if (track && track.previewUrl) {
        const filePath = path.join(__dirname, 'preview.mp3');

        const writer = fs.createWriteStream(filePath);
        const audioResponse = await axios({
          method: 'get',
          url: track.previewUrl,
          responseType: 'stream',
        });

        audioResponse.data.pipe(writer);

        writer.on('finish', async () => {
          const form = new FormData();
          form.append('recipient', JSON.stringify({ id: senderPsid }));
          form.append('message', JSON.stringify({
            attachment: {
              type: 'audio',
              payload: {}
            }
          }));
          form.append('filedata', fs.createReadStream(filePath));

          try {
            await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, form, {
              headers: form.getHeaders(),
            });
            console.log('🎵 Audio sent!');
          } catch (err) {
            console.error('❌ Error sending audio:', err.response?.data || err.message);
          }
        });
      } else {
        response = { text: "Sorry, couldn't find a playable preview." };
        callSendAPI(senderPsid, response);
      }
    } catch (err) {
      console.error('Error searching for song:', err);
      response = { text: "Sorry, something went wrong." };
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
