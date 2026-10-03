FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci needs every workspace's manifest (the admin demo in apps/admin-demo) before it installs
COPY apps/admin-demo/package.json apps/admin-demo/
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
