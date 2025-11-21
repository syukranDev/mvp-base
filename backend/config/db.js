
'use strict'

require('dotenv').config()

const Sequelize = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  timezone: process.env.DB_TIMEZONE || 'Asia/Kuala_Lumpur',
  benchmark: true,
  dialectOptions: {
    useUTC: true,
    ssl: { //notedev: PROD neon db need this object
      require: true,
      rejectUnauthorized: false 
    }
  },
  pool: {
    max: 600,
    min: 10,
    idle: 600000
  },
  logging: false,
  alter: false,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// public schema
db.users = require('../models/users.js')(sequelize, Sequelize);


// Test database connection and sync models
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
    // Sync database models after successful connection
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    console.log('Database models synchronized successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1); // Exit the process if database connection fails
  });

module.exports = db;