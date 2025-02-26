FROM --platform=$BUILDPLATFORM node:22.14.0-alpine3.20

WORKDIR /app

COPY ["package.json", "./", "package-lock.json", "./"]
COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]
COPY ["./.config", "./.config"]

RUN npm i

CMD ["npm", "run", "start:docker"]
