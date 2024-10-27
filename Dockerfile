FROM --platform=$BUILDPLATFORM node:20.12.1-alpine3.19

WORKDIR /replyvxtwitter

COPY ["package.json", "./", "package-lock.json", "./"]
COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]

RUN npm i

CMD ["npm", "start"]
