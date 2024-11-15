FROM --platform=$BUILDPLATFORM node:22.11.0-alpine3.20

WORKDIR /app

COPY ["package.json", "./", "package-lock.json", "./"]
COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]

RUN npm i

CMD ["npm", "run", "start:docker"]
