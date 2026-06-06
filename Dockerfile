FROM node:24-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build && npm prune --omit=dev

# Hosted containers should emit server trace lines to provider logs. Full
# payload logging remains local-only through MP_LOCAL_SERVER.
ENV MP_SERVER_LOG_CONSOLE=1
ENV MP_VERBOSE_SERVER_LOG=1

# Railway TCP proxy target fallback. Local source runs default to 12345 unless
# GAMEPLAY_PORT is set explicitly.
EXPOSE 8788

CMD [ "node", "dist/src/main.js" ]
