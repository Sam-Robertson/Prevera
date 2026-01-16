FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY packages/db/package.json packages/db/package.json
COPY packages/db/prisma packages/db/prisma
COPY packages/db/prisma.config.ts packages/db/prisma.config.ts
COPY packages/db/tsconfig.json packages/db/tsconfig.json
COPY packages/db/src packages/db/src

COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src

RUN corepack prepare pnpm@10.27.0 --activate
RUN pnpm install --frozen-lockfile

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
RUN pnpm --filter @prior-auth/db generate
RUN pnpm --filter @prior-auth/db build
RUN pnpm --filter api build

ENV NODE_ENV=production
EXPOSE 3002

CMD ["pnpm", "--filter", "api", "start"]
