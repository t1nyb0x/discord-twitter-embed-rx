FROM --platform=$BUILDPLATFORM node:24-alpine3.23

WORKDIR /app

COPY ["package.json", "./"]
COPY ["package-lock.json", "./"]
COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]
RUN npm ci

COPY ["./.config", "./.config"]

CMD ["npm", "run", "start:docker"]