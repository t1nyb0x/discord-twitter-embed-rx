FROM --platform=$BUILDPLATFORM node:22.14.0-alpine3.20

WORKDIR /app

COPY ["package.json", "./"]
COPY ["package-lock.json", "./"]
RUN npm ci

COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]
COPY ["./.config", "./.config"]

CMD ["npm", "run", "start:docker"]