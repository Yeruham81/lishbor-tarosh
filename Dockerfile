FROM oven/bun:1.4.2 AS builder

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

# Public Supabase values are required by Vite at build time.
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

ENV VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

RUN bun run build


FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY --from=builder /app/.output ./.output

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
