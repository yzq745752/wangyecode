FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3001

RUN mkdir -p /app/data

CMD ["npm", "run", "dev:server"]