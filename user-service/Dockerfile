FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 5001

CMD ["sh", "-c", "npx prisma db push && node app.js"]