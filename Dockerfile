FROM node:19-alpine

WORKDIR /app


COPY package*.json ./
# rm -rf node_modules
# rm -rf package-lock.json
# rm -rf build
RUN rm -rf node_modules
RUN rm -rf package-lock.json
RUN rm -rf build

RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "run", "start"]