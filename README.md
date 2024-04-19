## Environments

| Environment | Branch  | URLS                                                    | CI                                                                                                                                                                                                                                               | Documentation                           |
| ----------- | ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Development | develop | https://admin-api.playola.fm <br> https://admin.playola.fm | [![CircleCI](https://dl.circleci.com/status-badge/img/gh/briankeane/playola/tree/develop.svg?style=svg&circle-token=CCIPRJ_4VijKqPEovM5E7dGSTrXAi_80ca87be7dde79ffd962a4d4c350fd636a57db68)](https://dl.circleci.com/status-badge/redirect/gh/briankeane/playola/tree/develop) | [Docs](https://api-dev.playola.fm/docs) |


## Local Installation

* Install [Docker](https://www.docker.com/products/docker-desktop/)
* Create .env files in the following locations:
  * `./server/.env`  -- example file at `./server/.env-example`
* Running the following command from the root should install all containers and connect them together.


```
docker-compose up

```

* the server will be up and running at https://127.0.0.1:10020.  After it's running you can use the healthcheck endpoint to make sure: http://localhost:10020/v1/healthcheck



## Server Structure

### Authorization

Authorization is performed with a json web token in the header of requests under `Authorization: Bearer <token>`.  To obtain a bearer token, sign in with one of the following methods:

#### Spotify

Clients can authorize via the [Spotify Authorization Code Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow).

1. Client sends a GET request to `/v1/auth/spotify/web/authorize` (for web clients) or `/v1/auth/spotify/mobile/authorize` (for mobile clients).
2. The server redirects this to spotify, but replaces the client's `redirect_uri` with the server's `redirect_uri` in order to intercept the token and store it.
3. After the user signs in to spotify, they are redirected back to `/v1/auth/spotify/web/code` or `/v1/auth/spotify/mobile/code` with a new `code` token from spotify.
4. The server exchanges this code for an accessToken and refreshToken and finds or creates a spotifyUser and a User.
5. The server adds a json web token that can be used for playola authorization under `playolaToken` and redirects the user to the original client redirect_uri.
6. The client can authenticate with playola using the `playolaToken` as a Bearer token.  It can make spotify requests through the playola server or it can exchange the `code` directly with spotify for an auth token and refresh token.
7. When the client's spotify accessToken expires, it can swap the refreshToken for a new one at `/v1/auth/spotify/swap`.


### Songs and stationSongs

When a user is created, it fires a USER_CREATED event.  A worker picks up this event and asks spotify for all songs related to the user.


