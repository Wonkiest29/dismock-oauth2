import express from 'express';
import axios from 'axios';
import open from 'open';
import bodyParser from 'body-parser';

const CLIENT_ID = '11111';
const CLIENT_SECRET = '1111111';
const REDIRECT_URI = 'http://localhost:3000/callback';
const AUTH_URL = 'http://localhost:8081/oauth2/authorize';
const TOKEN_URL = 'http://localhost:8081/api/oauth2/token';
const USER_URL = 'http://localhost:8081/api/users/@me';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/login', (req, res) => {
    const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email`;
    open(authUrl);
    res.send('🔁 Открыто окно авторизации');
});

app.get('/callback', async (req, res) => {
    const { code } = req.query;

    try {
        const tokenRes = await axios.post(TOKEN_URL, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI
        });

        const accessToken = tokenRes.data.access_token;

        const userRes = await axios.get(USER_URL, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        res.json({
            message: '✅ Успешная авторизация',
            user: userRes.data
        });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send('❌ Ошибка авторизации');
    }
});

app.listen(3333, () => {
    console.log('🌐 OAuth2 клиент слушает http://localhost:3333/login');
});
