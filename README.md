## Environments

| Environment | Branch  | URL                                                    | CI                                                                                                                                                                                                                                               | Documentation                           |
| ----------- | ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Development | develop | https://dev.playola.fm <br> https://api-dev.playola.fm | [![CircleCI](https://dl.circleci.com/status-badge/img/gh/briankeane/playola/tree/develop.svg?style=svg&circle-token=c26b381796904c24cdcb23490aa30ab6d80f9698)](https://dl.circleci.com/status-badge/redirect/gh/briankeane/playola/tree/develop) | [Docs](https://api-dev.playola.fm/docs) |
| Production  | master  | https://playola.fm <br> https://api.playola.fm         | [![CircleCI](https://dl.circleci.com/status-badge/img/gh/briankeane/playola/tree/master.svg?style=svg&circle-token=c26b381796904c24cdcb23490aa30ab6d80f9698)](https://dl.circleci.com/status-badge/redirect/gh/briankeane/playola/tree/master)   | [Docs](https://playola.fm/docs)         |



## Local Installation

* Install [Docker](https://www.docker.com/products/docker-desktop/)
* Create .env files in the following locations:
  * `./client/.env`  -- example file at `./client/.env-example`
  * `./server/.env`  -- example file at `./server/.env-example`
* Running the following command from the root should install all containers and connect them together.
* the server will be up and running at https://127.0.0.1:10020.  After it's running you can use the healthcheck endpoint to make sure: http://localhost:10020/api/v1/healthcheck
