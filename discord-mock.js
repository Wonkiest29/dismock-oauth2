import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 8081;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const codes = {};
const tokens = {};
const refreshTokens = {};

function debug(...args) {
    console.log('[MOCK DISCORD]', ...args);
}

// Симуляция /oauth2/authorize (редирект с code)
app.get('/oauth2/authorize', (req, res) => {
    const { client_id, redirect_uri, response_type, scope, state } = req.query;

    debug('GET /oauth2/authorize', req.query);

    if (response_type !== 'code') {
        debug('Invalid response_type:', response_type);
        return res.status(400).send('Unsupported response_type');
    }

    // Генерируем код авторизации
    const code = uuidv4();
    codes[code] = {
        client_id,
        redirect_uri,
        scope,
        user_id: '999999999',
    };

    debug('Generated code:', code, 'for client_id:', client_id);

    const redirect = `${redirect_uri}?code=${code}${state ? `&state=${state}` : ''}`;
    debug('Would redirect to:', redirect);

    // Возвращаем 302 и Location, как настоящий Discord
    res.set('Location', redirect);
    return res.status(302).send(`Found. Redirecting to ${redirect}`);
});

// Симуляция /api/oauth2/token (обмен code на access_token или refresh_token на access_token)
app.post('/api/oauth2/token', (req, res) => {
    debug('POST /api/oauth2/token', req.body);

    const { grant_type, code, refresh_token, redirect_uri, client_id, client_secret } = req.body;

    if (grant_type === 'authorization_code') {
        if (!codes[code]) {
            debug('Invalid or expired code:', code);
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Invalid or expired authorization code.'
            });
        }

        const access_token = uuidv4();
        const refresh = uuidv4();
        const { user_id, scope } = codes[code];

        tokens[access_token] = { user_id, scope };
        refreshTokens[refresh] = { user_id, scope };

        debug('Issued access_token:', access_token, 'refresh_token:', refresh, 'for user:', user_id);

        delete codes[code];

        return res.json({
            access_token,
            token_type: 'Bearer',
            expires_in: 604800,
            refresh_token: refresh,
            scope,
        });
    }

    if (grant_type === 'refresh_token') {
        if (!refreshTokens[refresh_token]) {
            debug('Invalid or expired refresh_token:', refresh_token);
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Invalid or expired refresh token.'
            });
        }

        const access_token = uuidv4();
        const { user_id, scope } = refreshTokens[refresh_token];

        tokens[access_token] = { user_id, scope };

        debug('Refreshed access_token:', access_token, 'for user:', user_id);

        return res.json({
            access_token,
            token_type: 'Bearer',
            expires_in: 604800,
            refresh_token, // Discord обычно возвращает тот же refresh_token
            scope,
        });
    }

    debug('Unsupported grant_type:', grant_type);
    return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code and refresh_token are supported.'
    });
});

// Симуляция /api/users/@me (информация о пользователе)
app.get('/api/users/@me', (req, res) => {
    const auth = req.headers.authorization;
    debug('GET /api/users/@me', 'Authorization:', auth);

    if (!auth) {
        debug('Missing Authorization header');
        return res.status(401).json({ error: 'invalid_request', error_description: 'Missing Authorization header.' });
    }
    const token = auth.split(' ')[1];

    if (!tokens[token]) {
        debug('Invalid or expired token:', token);
        return res.status(401).json({ error: 'invalid_token', error_description: 'Invalid or expired token.' });
    }

    debug('Returning user info for token:', token);

    res.json({
        id: tokens[token].user_id,
        username: 'MockedUser',
        discriminator: '0420',
        avatar: 'mocked_avatar.png',
        email: 'mock@localhost',
        verified: true,
        locale: 'en-US',
        mfa_enabled: false,
        flags: 0,
        banner: null,
        accent_color: null,
        premium_type: 1,
        public_flags: 0,
    });
});

// Симуляция /api/users/@me/guilds (список серверов пользователя)
app.get('/api/users/@me/guilds', (req, res) => {
    const auth = req.headers.authorization;
    debug('GET /api/users/@me/guilds', 'Authorization:', auth);

    if (!auth) {
        debug('Missing Authorization header');
        return res.status(401).json({ error: 'invalid_request', error_description: 'Missing Authorization header.' });
    }
    const token = auth.split(' ')[1];

    if (!tokens[token]) {
        debug('Invalid or expired token:', token);
        return res.status(401).json({ error: 'invalid_token', error_description: 'Invalid or expired token.' });
    }

    debug('Returning guilds for token:', token);

    res.json([
        {
            id: '1234567890',
            name: 'Mock Guild',
            icon: null,
            owner: true,
            permissions: '2147483647',
            features: [],
        }
    ]);
});

app.listen(PORT, () => {
    debug(`✅ Mock Discord OAuth2 API running at http://localhost:${PORT}`);
});