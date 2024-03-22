const jwt = require('express-jwt').expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
});

function authenticate(req, res, next) {
  if (req.headers.authorization === `Basic ${process.env.SERVICE_API_TOKEN}`) {
    return next();
  }
  jwt(req, res, (err) => {
    if (req.auth) {
      req.user = req.auth; // ToDo: Why did jwt change this from user to auth?
      // and should we migrate the rest of the code instead of using this hack
      return next();
    } else {
      let error = new Error('Invalid credentials');
      error.code = 'jwt';
      error.statusCode = 401;
      return next(error);
    }
  });
}

function authenticateAccessTokenOnly(req, res, next) {
  jwt(req, res, (err) => {
    if (req.user) {
      return next();
    } else {
      let error = new Error(
        'Invalid credentials: accessToken required for this endpoint.'
      );
      error.code = 'jwt';
      err.statusCode = 401;
      return next(err);
    }
  });
}

module.exports = {
  authenticate,
  authenticateAccessTokenOnly,
};
