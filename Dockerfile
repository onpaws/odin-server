FROM node:14-alpine as builder

RUN apk update && apk add make g++ python
WORKDIR /app
COPY package*.json /app/
RUN npm ci
COPY tsconfig.json /app/
COPY src /app/src
RUN npm run build
RUN LDFLAGS='-static-libgcc -static-libstdc++' npm ci --build-from-source=pg-native --production

FROM astefanutti/scratch-node
#FROM node:14 as runner

WORKDIR /app
COPY --from=0 /app/node_modules node_modules
COPY --from=0 /app/package.json /app/
COPY --from=0 /app/dist/ /app/dist/
EXPOSE 5000
ENTRYPOINT ["node", "dist/index.js"]