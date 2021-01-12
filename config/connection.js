var MongoClient = require('mongodb').MongoClient;

const state = {
    db: null
}

module.exports.connect = function (done) {
    const dbname = 'ClassManagementSystem'
    const url = process.env.MONGO_URL || "mongodb://localhost:27017/ClassManagementSystem";

    MongoClient.connect(url, {useUnifiedTopology:true}, (err, data) => {
        if (err) return done(err)
        state.db = data.db(dbname)
        done()
    })

}

module.exports.get = function () {
    return state.db
}