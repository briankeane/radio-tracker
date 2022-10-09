/*
 * This is only for cli migrations -- not used by the actual app.
 */

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    //
    // the database name must be provided for sequelize-cli,
    // even though it is included in the url
    //
    database: process.env.DATABASE_URL.split("/").slice(-1)[0],
  },
  test: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    database: process.env.DATABASE_URL.split("/").slice(-1)[0],
  },
  production: {
    url: `${process.env.DATABASE_URL}?ssl=true`,
    dialect: "postgres",
    ssl: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, //https://github.com/brianc/node-postgres/issues/2009#issuecomment-556020509
      },
    },
    database: process.env.DATABASE_URL.split("/").slice(-1)[0],
  },
};
