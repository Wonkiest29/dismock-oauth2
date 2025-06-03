# DiscordMock

A simple mock implementation of Discord's OAuth2 API for local development and testing, along with a sample OAuth2 client.

## Features

- Mock Discord OAuth2 endpoints (`/oauth2/authorize`, `/api/oauth2/token`, `/api/users/@me`, `/api/users/@me/guilds`)
- Simulates authorization code and token exchange flows
- Provides fake user and guild data
- Includes a sample client for testing the OAuth2 flow

## Project Structure

- `discord-mock.js` — Mock Discord OAuth2 API server
- `client.ds.js` — Example OAuth2 client using the mock server
- `package.json` — Project dependencies and scripts

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Start the mock Discord server

```sh
npm start
```

The server will run at [http://localhost:8081](http://localhost:8081).

### 3. Run the OAuth2 client

In a separate terminal:

```sh
node client.ds.js
```

Visit [http://localhost:3333/login](http://localhost:3333/login) in your browser to start the OAuth2 flow.

## Notes

- The mock server does **not** implement real authentication or security.
- For development and testing purposes only.

## License

MIT License
