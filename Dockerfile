FROM node:14-alpine as builder

RUN apk update && apk add make g++ python

WORKDIR /app

COPY . .

RUN LDFLAGS='-static-libgcc -static-libstdc++' npm ci --build-from-source=pg-native

RUN yarn build

FROM astefanutti/scratch-node
#FROM node:14 as runner

WORKDIR /app

COPY --from=0 /app/node_modules node_modules
COPY --from=0 /app/package.json .
COPY --from=0 /app/dist/ src

ENTRYPOINT ["node", "src/index.js"]