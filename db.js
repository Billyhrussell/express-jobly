"use strict";

/** Database setup for jobly. */

const { Client } = require("pg");
// var types = require('pg').types
// types.setTypeParser(1700, function(val) {
//   return parseFloat(val)
// })
const { getDatabaseUri } = require("./config");

const db = new Client({
  connectionString: getDatabaseUri(),
});

db.connect();

module.exports = db;
