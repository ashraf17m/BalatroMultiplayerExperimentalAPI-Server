# Balatro Multiplayer Server

TCP game server for Balatro Multiplayer. It coordinates multiplayer lobby and match state, routes messages between connected players, and keeps the server-side parts of the multiplayer session in sync.

The server is not a Balatro gameplay simulator. Card effects, scoring, money changes, jokers, decks, and other gameplay-content behavior are handled by the game clients. The server only coordinates the multiplayer state needed for players to play together.

## Overview

- **Transport:** Raw TCP sockets using newline-delimited JSON messages.
- **Protocol:** Current clients and the server communicate through validated protocol v2 messages, plus connection keep-alive messages.
- **Hosting:** The internal bind address and port depend on the environment. Public hosts may expose a different external TCP host/port than the internal server port.
- **Security:** The gameplay server has no built-in TLS or account authentication. Run it in an environment you trust, or put appropriate transport/security controls in front of it.

## Setup

```bash
npm install
npm run build
npm run start
```

For development:

```bash
npm run dev
```

The root `start_local_server.bat` helper enables local file logging and mirrors server trace lines to the terminal. The file log is written to `server/logs/server-runtime.log`. Local terminal logs use stable colors per `clientId` when `MP_LOCAL_SERVER=1` and `MP_SERVER_LOG_COLOR=1`. Set `MP_VERBOSE_SERVER_LOG=1` only when you need full incoming/outgoing packet traces.

Docker deployments enable summarized console trace logging by default through `MP_SERVER_LOG_CONSOLE=1` and `MP_VERBOSE_SERVER_LOG=1`, so provider logs show incoming and outgoing server messages except keep-alive traffic. Full payload logs are intentionally still local-only.

## Configuration

The server reads its runtime configuration from environment variables. Local testing uses local defaults; public hosting should use the TCP endpoint exposed by the hosting provider.

When running on Railway or a similar host, configure the service as a TCP server and use the public TCP proxy host and port shown by the provider when configuring the mod.

## Connecting The Mod

The Balatro Multiplayer mod must be configured to connect to the same public or local TCP endpoint where this server is reachable.

Use a matching mod and server version. Protocol mismatches can cause connection failures, ignored messages, or rejected payloads.

## Server Responsibilities

The server is responsible for:

- accepting TCP client connections;
- creating, joining, leaving, and updating lobbies;
- tracking lobby membership and host state;
- coordinating match start, blind readiness, PvP/team outcomes, timers, reconnect/resume, and multiplayer-only state;
- relaying multiplayer feature messages between the intended players;
- rejecting malformed protocol messages.

The server is not responsible for:

- calculating Balatro scores;
- deciding how modded cards, jokers, decks, blinds, or consumables behave;
- enforcing vanilla gameplay assumptions that would block modded content;
- storing permanent player accounts or save files.

## Notes For Public Hosting

Use the public TCP endpoint given by the hosting provider, not necessarily the internal bind port printed by Node. If the server starts but clients cannot connect, check that a public TCP proxy or equivalent forwarding rule exists.

This server trusts the connected clients. It is suitable for friendly multiplayer sessions, but public deployment should be treated as an exposed TCP service.

## License

This project follows the license of the Balatro Multiplayer project it is based on.
