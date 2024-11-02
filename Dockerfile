FROM --platform=$BUILDPLATFORM node:20.18.0-alpine3.20

WORKDIR /app

COPY ["package.json", "./", "package-lock.json", "./"]
COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]

RUN npm i

CMD ["npm", "start"]
