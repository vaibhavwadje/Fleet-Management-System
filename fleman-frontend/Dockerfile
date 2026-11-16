# ─────────────────────────────────────────────────────────────────────────────
#  FLEMAN - React frontend
#
#  WHY NGINX AND NOT `serve -s dist`
#
#  The React code calls /api/... with no host. In development the Vite dev
#  server proxies those to the backend; in a production image there is no dev
#  server, so something else has to. `serve -s dist` does not - and its -s flag
#  makes it worse than useless here: unknown paths fall back to index.html, so
#  GET /api/states returns the SPA shell with a 200 OK and the app dies on a
#  JSON parse error instead of a clean 404 that would point at the cause.
#
#  nginx serves the bundle AND proxies the API on one origin. That also means
#  no CORS, no absolute URLs baked into the bundle, and - the useful part -
#  the choice of backend becomes an nginx upstream resolved at container start
#  rather than at build time. One image, either backend.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1 : build the bundle ───────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Manifest first so `npm install` is cached independently of source changes.
COPY package.json ./

# `npm install`, not `npm ci`: this project's lockfile is pnpm-lock.yaml and
# npm cannot read it, so there is no npm lockfile to be strict against. Worth
# knowing that this makes builds non-reproducible - a patch release of a
# dependency can change between two builds of the same commit.
#
# To fix it properly, either commit a package-lock.json and switch this to
# `npm ci`, or install pnpm here and use `pnpm install --frozen-lockfile`
# against the lockfile that actually exists.
RUN npm install

COPY . .

# vite build. The API base URL is deliberately NOT a build argument: nothing in
# src/ reads one. Every call is a relative path, resolved by nginx at runtime.
RUN npm run build

# ── Stage 2 : serve ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# A template, not a finished config. nginx's entrypoint runs envsubst over
# everything in /etc/nginx/templates at start-up, which is how BACKEND_ORIGIN
# gets filled in from the compose profile.
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# Deliberately NOT under templates/. It contains $host, $scheme and friends,
# which nginx computes per request - envsubst would replace them with empty
# strings and the OAuth redirect would break in a way nothing points at.
COPY docker/proxy_common.conf /etc/nginx/proxy_common.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx's own entrypoint handles the templating, so it is left in place.
CMD ["nginx", "-g", "daemon off;"]
