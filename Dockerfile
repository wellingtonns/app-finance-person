FROM node:20-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm test
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV PORT=80

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/server.cjs ./server.cjs

EXPOSE 80

CMD ["node", "server.cjs"]
