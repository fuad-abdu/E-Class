// var MongoClient = require('mongodb').MongoClient;
// const state = {
//     db: null
// }

// module.exports.connect = function (done) {
//     const dbname = 'ClassManagementSystem'
//     const url = "mongodb://localhost:27017/test"

//     MongoClient.connect(url, (err, data) => {
//         if (err) return done(err)
//         state.db = data.db(dbname)
//         done()
//     })

// }

const { Pool, Client } = require('pg')

const pool = new Pool({
    user: 'yodgyjdhgataqd',
    host: 'ec2-3-216-181-219.compute-1.amazonaws.com',
    database: 'd3b634raudna8r',
    password: 'ca931cc57e35f0b0c02ceffbe80fff12f59d32038961a80e7e486385a0a05809',
    port: 5432,
})
pool.query('SELECT NOW()', (err, res) => {
  console.log(err, res)
  pool.end()
})
const client = new Client({
  user: 'yodgyjdhgataqd',
  host: 'ec2-3-216-181-219.compute-1.amazonaws.com',
  database: 'd3b634raudna8r',
  password: 'ca931cc57e35f0b0c02ceffbe80fff12f59d32038961a80e7e486385a0a05809',
  port: 5432,
})

const state = {
    db: client
}

module.exports.get = function () {
    return state.db
}