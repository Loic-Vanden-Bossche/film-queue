# -----------------------------
# deps: install all deps (for build)
# -----------------------------
FROM node:24-bookworm-slim AS deps
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
# Copy the whole repo so Yarn sees all workspaces correctly
COPY . .

RUN corepack enable && yarn install --immutable


# -----------------------------
# build: build the frontend
# -----------------------------
FROM deps AS build
RUN yarn workspace film-queue-frontend build


# -----------------------------
# runner: install ONLY prod deps for frontend and run it
# -----------------------------
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy Yarn + workspace manifests (and workspace sources so Yarn can locate the workspace)
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
COPY apps/frontend/package.json apps/frontend/package.json
# Copy the frontend workspace itself (needed for `next start` + Next runtime files)
COPY apps/frontend apps/frontend

# Install only production deps needed by the frontend workspace
RUN corepack enable && yarn workspaces focus film-queue-frontend --production

# Bring in build output (overwrites any existing .next from the copy above)
COPY --from=build /app/apps/frontend/.next /app/apps/frontend/.next
COPY --from=build /app/apps/frontend/public /app/apps/frontend/public

EXPOSE 3000
CMD ["yarn", "workspace", "film-queue-frontend", "start"]
