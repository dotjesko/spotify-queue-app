const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5500',
  methods: ['GET', 'POST']
}));

// Konfiguration
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';

// Authentifizierung
app.get('/login', (req, res) => {
  const scope = 'user-modify-playback-state';
  res.redirect(`https://accounts.spotify.com/authorize?${
    new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI
    })
  }`);
});

app.get('/callback', async (req, res) => {
  try {
    const { data } = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: req.query.code,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    res.redirect(`http://localhost:5500/frontend.html?access_token=${data.access_token}`);
  } catch (error) {
    res.status(500).send('Authentifizierung fehlgeschlagen');
  }
});

// API-Endpunkte
app.get('/search', async (req, res) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { 'Authorization': `Bearer ${req.query.access_token}` },
      params: {
        q: req.query.q,
        type: 'track',
        market: 'DE',
        limit: 7
      }
    });
    res.json(response.data.tracks.items);
  } catch (error) {
    res.status(500).json({ error: 'Suche fehlgeschlagen' });
  }
});

app.post('/add-to-queue', async (req, res) => {
  try {
    await axios.post(
      'https://api.spotify.com/v1/me/player/queue',
      null,
      {
        headers: { 'Authorization': `Bearer ${req.query.access_token}` },
        params: { uri: req.query.track_uri }
      }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Hinzufügen fehlgeschlagen' });
  }
});

app.get('/queue', async (req, res) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/queue', {
      headers: { 'Authorization': `Bearer ${req.query.access_token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Warteschlange konnte nicht geladen werden' });
  }
});

app.listen(3000, () => console.log('Server läuft auf http://localhost:3000'));