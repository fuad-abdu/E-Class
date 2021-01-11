var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var hbs = require('express-handlebars');
var socket_io    = require( "socket.io" );
const io = socket_io();
var Router = require('./routes/routes')(io);
var usersRouter = require('./routes/users');
var fileupload = require('express-fileupload');


var db = require('./config/connection');
var session = require('express-session');

var MongoDBStore = require('connect-mongodb-session')(session);
// const { nextTick } = require('process');
var app = express();

app.io = io

io.on("connection", function (socket) {
  socket.on("sendNotification", function (details) {
    socket.broadcast.emit("sendNotification", details)
  });
});

require('dotenv').config();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials/' }))
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileupload())
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})


// app.use(function(req, res, next) {
//   res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
//   next();
// });
var store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/connect_mongodb_session_test',
  collection: 'mySessions'
});

store.on('error', function (error) {
  console.log(error);
});

let sessionTime = 1000 * 60 * 60 * 24 * 7
app.use(session({
  secret: 'key',
  store: store,
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: sessionTime }
}))

db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('MongoDB connected');
  }
})
app.use('/', Router);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
