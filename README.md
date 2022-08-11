# motomuro

Experimental online multiplayer game written in nodejs with websockets. Start a game with your friends: move your tron-like moto and avoid other tracks.

## try it online

Visit: https://motomuro.matb.it

## develop

    npm install
    nodemon

open http://localhost:8000

## production

    node server/server.js

nginx sample configuration:

    server {
    server_name motomuro.matb.it;

    location / {
            proxy_pass http://localhost:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

## docker

create docker container:

    docker build . -t paolini/motomuro
    docker tag paolini/motomuro paolini/motomuro:latest

push image on dockerhub: 
    
    docker push paolini/motomuro

## to do

* use `babylon.js` or similar?