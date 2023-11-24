FROM --platform=$BUILDPLATFORM node:20.9.0-buster

WORKDIR /replyvxtwitter

COPY ["package.json", "./", "package-lock.json", "./"]
COPY ["tsconfig.json", "./"]
COPY ["./src", "./src"]

RUN npm i

CMD ["npm", "start"]