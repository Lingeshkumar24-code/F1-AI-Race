# Stage 1: Build React app
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . ./

# Set API URL environment variable for compilation
ENV VITE_API_URL=http://localhost:8000
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
