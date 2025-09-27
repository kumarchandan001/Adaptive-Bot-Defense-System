FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY src ./src
COPY jest.config.js ./jest.config.js
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]


