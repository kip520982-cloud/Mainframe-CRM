# ===========================================================================
# Mainframe CRM — Railway production image (server + frontend)
# Single-target build: Railway does not support `docker build --target`.
# Mirrors Twenty's `twenty` target from packages/twenty-docker/twenty/Dockerfile.
# ===========================================================================

FROM node:26.12.1-alpine3.23 AS node-base

# Node 26 images no longer bundle Yarn; run the release pinned in .yarnrc.yml.
RUN printf '%s\n' '#!/bin/sh' 'exec node "/app/$(sed -n "s/^yarnPath: //p" /app/.yarnrc.yml)" "$@"' \
      > /usr/local/bin/yarn && \
    chmod +x /usr/local/bin/yarn

# ---------------------------------------------------------------------------
# Dependency stage (all workspaces needed for server + frontend)
# ---------------------------------------------------------------------------
FROM node-base AS deps

WORKDIR /app

COPY ./package.json ./yarn.lock ./.yarnrc.yml ./tsconfig.base.json ./nx.json /app/
COPY ./.yarn/releases /app/.yarn/releases
COPY ./.yarn/patches /app/.yarn/patches

COPY ./packages/twenty-ui/package.json /app/packages/twenty-ui/
COPY ./packages/twenty-shared/package.json /app/packages/twenty-shared/
COPY ./packages/twenty-front/package.json /app/packages/twenty-front/
COPY ./packages/twenty-front-component-renderer/package.json /app/packages/twenty-front-component-renderer/
COPY ./packages/twenty-sdk/package.json /app/packages/twenty-sdk/
COPY ./packages/twenty-client-sdk/package.json /app/packages/twenty-client-sdk/
COPY ./packages/twenty-emails/package.json /app/packages/twenty-emails/
COPY ./packages/twenty-server/package.json /app/packages/twenty-server/
COPY ./packages/twenty-server/patches /app/packages/twenty-server/patches
COPY ./packages/twenty-oxlint-rules/package.json /app/packages/twenty-oxlint-rules/

RUN yarn workspaces focus twenty-monorepo twenty-server twenty-emails twenty-shared twenty-client-sdk twenty-front twenty-front-component-renderer twenty-ui twenty-sdk && \
    yarn cache clean && npx nx reset

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM deps AS build

COPY ./packages/twenty-emails /app/packages/twenty-emails
COPY ./packages/twenty-shared /app/packages/twenty-shared
COPY ./packages/twenty-client-sdk /app/packages/twenty-client-sdk
COPY ./packages/twenty-server /app/packages/twenty-server
COPY ./packages/twenty-front /app/packages/twenty-front
COPY ./packages/twenty-front-component-renderer /app/packages/twenty-front-component-renderer
COPY ./packages/twenty-ui /app/packages/twenty-ui
COPY ./packages/twenty-sdk /app/packages/twenty-sdk

# Compile committed catalogs only — extract is host-side and burns build RAM/time.
RUN npx nx run twenty-server:lingui:compile && \
    npx nx run twenty-emails:lingui:compile

RUN npx nx run twenty-server:build

RUN npx nx run twenty-front:lingui:compile

# Lean production front build — no sourcemaps; 8GB heap fits Railway builders better than 12GB.
RUN CI=true \
    NODE_ENV=production \
    VITE_BUILD_SOURCEMAP=false \
    NODE_OPTIONS="--max-old-space-size=8192" \
    npx nx build twenty-front

# Clean server build output (type declarations and compiled tests not needed at runtime)
RUN find /app/packages/twenty-server/dist -name '*.d.ts' -delete \
 && rm -rf /app/packages/twenty-server/dist/packages/twenty-server/test

RUN yarn workspaces focus --production twenty-emails twenty-shared twenty-client-sdk twenty-server

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM node-base AS runtime

RUN apk add --no-cache \
    'curl>=8.22.0-r0' \
    'libexpat>=2.8.5-r0' \
    'nghttp2-libs>=1.69.0-r0' \
    'libcrypto3>=3.5.8-r0' \
    'libssl3>=3.5.8-r0' \
    'postgresql18-client>=18.5-r0' \
    'jq>=1.8.2-r0'

COPY ./packages/twenty-docker/twenty/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
WORKDIR /app/packages/twenty-server

ENV NODE_ENV=production

# Workspace root config
COPY --chown=1000 --from=build /app/package.json /app/yarn.lock /app/.yarnrc.yml /app/
COPY --chown=1000 --from=build /app/tsconfig.base.json /app/nx.json /app/
COPY --chown=1000 --from=build /app/.yarn /app/.yarn
COPY --chown=1000 --from=build /app/node_modules /app/node_modules

# Server package (compiled dist + package.json only)
COPY --chown=1000 --from=build /app/packages/twenty-server/package.json /app/packages/twenty-server/
COPY --chown=1000 --from=build /app/packages/twenty-server/dist /app/packages/twenty-server/dist
COPY --chown=1000 --from=build /app/packages/twenty-server/patches /app/packages/twenty-server/patches
COPY --chown=1000 --from=build /app/packages/twenty-server/scripts /app/packages/twenty-server/scripts
RUN chmod +x /app/packages/twenty-server/scripts/command-background.sh

# Workspace packages (dist + package.json)
COPY --chown=1000 --from=build /app/packages/twenty-shared/package.json /app/packages/twenty-shared/
COPY --chown=1000 --from=build /app/packages/twenty-shared/dist /app/packages/twenty-shared/dist
COPY --chown=1000 --from=build /app/packages/twenty-emails/package.json /app/packages/twenty-emails/
COPY --chown=1000 --from=build /app/packages/twenty-emails/dist /app/packages/twenty-emails/dist
COPY --chown=1000 --from=build /app/packages/twenty-client-sdk/package.json /app/packages/twenty-client-sdk/
COPY --chown=1000 --from=build /app/packages/twenty-client-sdk/dist /app/packages/twenty-client-sdk/dist

# Frontend static build (served by the server)
COPY --chown=1000 --from=build /app/packages/twenty-front/build /app/packages/twenty-server/dist/front

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/include/node && \
    find /app/node_modules -type d -name example -prune -exec rm -rf {} +

RUN mkdir -p /app/.local-storage /app/packages/twenty-server/.local-storage && \
    chown 1000:1000 /app/.local-storage /app/packages/twenty-server/.local-storage

USER 1000

CMD ["node", "dist/main"]
ENTRYPOINT ["/app/entrypoint.sh"]
