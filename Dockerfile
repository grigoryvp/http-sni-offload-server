FROM ubuntu:16.10

RUN true && \
  apt-get update && \
  apt-get install -y \
  apt-utils \
  curl \
  haproxy

RUN curl -LSs https://deb.nodesource.com/setup_7.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app

COPY entrypoint.sh ./
COPY entrypoint.js ./
COPY package.json ./

RUN npm install

ENTRYPOINT /bin/sh ./entrypoint.sh

