import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 8081;
const multiuser = true; // Флаг для поддержки мульти-аккаунтов

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const codes = {};
const tokens = {};
const refreshTokens = {};

// Задаём bigint ID для пользователей
const users = {
    user1: 741957448532754493n, // Пример ID пользователя в bigint формате
    user2: 1380646048556515359n,
    user3: 310848622642069504n,
};

function debug(...args) {
    console.log('[MOCK DISCORD]', ...args);
}

// Симуляция /oauth2/authorize (редирект с code)
app.get('/oauth2/authorize', (req, res) => {
    const { client_id, redirect_uri, response_type, scope, state, selected_user } = req.query;

    if (response_type !== 'code') {
        return res.status(400).send('Unsupported response_type');
    }

    if (!multiuser) {
        // Без выбора пользователя, сразу выдаём code для дефолтного user
        const defaultUserKey = 'user1'; // Можно изменить на любого из users
        const code = uuidv4();

        const user_id = users[defaultUserKey] || 0n;

        codes[code] = {
            client_id,
            redirect_uri,
            scope,
            user_id,
        };

        const redirect = `${redirect_uri}?code=${code}${state ? `&state=${state}` : ''}`;

        return res.redirect(redirect);
    }

    // Если multiuser = true, как было раньше — показываем выбор аккаунта
    if (!selected_user) {
        return res.send(`
            <html>
                <body>
                    <h2>Выберите аккаунт</h2>
                    <form method="GET" action="/oauth2/authorize">
                        <input type="hidden" name="client_id" value="${client_id}" />
                        <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
                        <input type="hidden" name="response_type" value="${response_type}" />
                        <input type="hidden" name="scope" value="${scope}" />
                        ${state ? `<input type="hidden" name="state" value="${state}" />` : ''}
                        
                        <select name="selected_user" required>
                            <option value="">--Выберите аккаунт--</option>
                            <option value="user1">example1</option>
                            <option value="user2">example2</option>
                            <option value="user3">example3</option>
                        </select>
                        <button type="submit">Авторизоваться</button>
                    </form>
                </body>
            </html>
        `);
    }

    // Если selected_user выбран, создаём код как обычно
    const code = uuidv4();

    const user_id = users[selected_user] || 0n;

    codes[code] = {
        client_id,
        redirect_uri,
        scope,
        user_id,
    };

    const redirect = `${redirect_uri}?code=${code}${state ? `&state=${state}` : ''}`;

    res.redirect(redirect);
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

        debug('Issued access_token:', access_token, 'refresh_token:', refresh, 'for user:', user_id.toString());

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

        debug('Refreshed access_token:', access_token, 'for user:', user_id.toString());

        return res.json({
            access_token,
            token_type: 'Bearer',
            expires_in: 604800,
            refresh_token,
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

    const { user_id } = tokens[token];

    debug('Returning user info for token:', token);

    res.json({
        id: user_id.toString(),  // преобразуем bigint в строку
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
