FROM node:12
WORKDIR /src
COPY package.json /src
RUN npm install
COPY . /src
CMD npm start
EXPOSE 3333