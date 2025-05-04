FROM --platform=$BUILDPLATFORM node:22.15.0-alpine3.20

WORKDIR /app

COPY ["package.json", "./"]
COPY ["package-lock.json", "./"]
COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]
RUN npm ci

COPY ["./.config", "./.config"]

CMD ["npm", "run", "start:docker"]