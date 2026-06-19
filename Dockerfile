FROM node:24-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend ./backend
COPY bd ./bd

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "cd backend && npm run db:setup && npm start"]
