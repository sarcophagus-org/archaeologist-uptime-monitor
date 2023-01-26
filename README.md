# archaeologist-uptime-monitor

## Quickstart:

- Clone the repo
- `cp .env.example .env`
- `nano .env` and edit as necessary
- `docker compose up`

DONE!

Build a new image:
`docker build --pull --rm -f "Dockerfile" -t archaeologist-uptime-monitor:latest "."`

### Running without Docker

- `nvm use`
- `npm i`
- `cp .env.example .env`
- `nano .env` and edit as necessary
- `npm run start` to build and start the service
