# Fetching the latest node image on alpine linux
FROM node:alpine AS development

# Declaring env
ENV NODE_ENV development

# Setting up the work directory
WORKDIR /my-app

# Installing dependencies
COPY ./package*.json /my-app/

RUN npm install

# Copying all the files in our project
COPY . .

EXPOSE 8080
# Starting our application
CMD ["npm","start"]