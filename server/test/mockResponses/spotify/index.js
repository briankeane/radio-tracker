module.exports = {
  api_token_swap_code_200: require('./api_token_swap_code_200.json'),
  api_token_swap_refresh_token_200: require('./api_token_swap_refresh_token_200.json'),
  api_get_me_200: require('./api_get_me_200.json'),
  unauthorized_401_error_body: require('./unauthorized_401_error_body.json'),

  // GET https://api.spotify.com/v1/me/player/recently-played?access_token={{spotify_access_token}}
  api_get_me_recently_played_200: require('./api_get_me_recently_played_200.json'),

  // GET http://api.spotify.com/v1/me/top/tracks
  api_get_me_top_tracks_200: require('./api_get_me_top_tracks_200.json'),

  // GET http://api.spotify.com/v1/me/tracks?access_token={{spotify_access_token}}&limit=50
  api_get_me_saved_tracks_200: require('./api_get_me_saved_tracks_200'),

  // GET http://api.spotify.com/v1/me/tracks?access_token={{spotify_access_token}}&limit=50&offset=300
  api_get_me_saved_tracks_final_chunk_200: require('./api_get_me_saved_tracks_final_chunk_200'),

  // GET https://api.spotify.com/v1/recommendations?seed_tracks=6J67JeDrWbUFAhtJdbma8K,2zNtLGfqiiZvb6JcktlPGx&limit=50
  api_get_recommendations_200: require('./api_get_recommendations_200.json'),

  api_get_track_200: require('./api_get_track_200.json'),
};
