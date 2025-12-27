FROM node:24-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxkbcommon0 \
  libxshmfence1 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Yarn + root metadata
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/

# Copy ONLY the worker workspace manifest so Yarn can resolve it
COPY apps/worker/package.json apps/worker/package.json

# Install only production deps needed for the worker workspace
RUN corepack enable && yarn workspaces focus film-queue-worker --production

# Now copy the worker source
COPY apps/worker apps/worker

ENV NODE_ENV=production
EXPOSE 4000
CMD ["yarn", "workspace", "film-queue-worker", "start"]
