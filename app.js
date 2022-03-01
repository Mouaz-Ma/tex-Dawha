require('dotenv').config({
  path: __dirname + '/.env'
});
const createError = require('http-errors'),
      express = require('express'),
      path = require('path'),
      cookieParser = require('cookie-parser'),
      logger = require('morgan'),
      qr = require("qrcode"),
      nodeMailer = require('nodemailer'),
      session = require('express-session'),
      MongoStore = require('connect-mongo'),
      flash = require('connect-flash'),
      methodOverride = require('method-override'),
      fs = require('fs'),
      passport = require('passport'),
      localStrategy = require('passport-local'),
      University = require('./models/users'),
      excel = require('exceljs'),
      moment = require('moment');

// canvas setup
const {
  createCanvas,
  loadImage
} = require('canvas')

const indexRouter = require('./routes/index');
const registerRoutes = require('./routes/register')

const mongoose = require('mongoose');

const User = require('./models/users');
const Degree = require('./models/degree');
const Visitor = require('./models/visitor');
const {
  isLoggedIn
} = require('./middleware');

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
});
// mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false , useCreateIndex: true});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});


const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const store = new MongoStore({
  mongoUrl: process.env.DB_URL,
  secret: process.env.SESSION_SECRET,
  touchAfter: 24 * 3600
})

store.on("error", function (e) {
  console.log("SESSION STORE ERROR", e)
})

const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
};

app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(University.authenticate()));

passport.serializeUser(University.serializeUser());
passport.deserializeUser(University.deserializeUser());
app.use(flash());
app.use(methodOverride('_method'))

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
})

app.use('/', registerRoutes);
app.use('/', indexRouter);
//app.use('/users', usersRouter);

// the search 
app.get('/search/name', function(req, res, next){
  let q = req.query.q;
  // partial text search using regex
  Visitor.find({
    Name: {
      $regex: new RegExp(req.query.q),
    }
  }, {
    __v: 0
  }, function(err, data) {
    let realData = [];
    for(var i = 0 ; i < data.length ; i++){
      if (i != 0 && data[i].Name != data[i-1].Name){
        realData.push(data[i]);
      }
    }
    res.json(realData);
    console.log(realData);
    // console.log(data);
  }).limit(10); 
});

app.get('/search/number', function(req, res, next){
  let q = req.query.q;
  // partial text search using regex
  Visitor.find({
    telephonNumber: {
      $regex: new RegExp(q)
    }
  }, {
    __v: 0
  }, function(err, data) {
    let realData = [];
    for(var i = 0 ; i < data.length ; i++){
      if (i != 0 && data[i].Name != data[i-1].Name){
        realData.push(data[i]);
      }
    }
    res.json(realData);
    console.log(realData);
    // console.log(data);
  }).limit(10); 
});

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

// Setting up the port for listening requests
const port = process.env.PORT || 5000;
app.listen(port, () => console.log("Server at 5000"));

//testing token
