const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const passport = require('passport');
const { sequelize } = require('./models');
const helmet = require('helmet');
const hpp = require('hpp');
const redis = require('redis');
const { RedisStore } = require('connect-redis');

dotenv.config();
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
    legacyMode: false,
});
redisClient.on('connect', () => {
    console.info('Redis connected!');
 });
 redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
 });
 redisClient.connect().then();

const pageRouter = require('./routes/page');
const authRouter = require('./routes/auth');
const postRouter = require('./routes/post');
const userRouter = require('./routes/user');
const passportConfig = require('./passport');

const app = express();
passportConfig();
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});

(async () => {
    try {
        await sequelize.sync({ force: false });
        console.log('데이터베이스 연결 성공');
    } catch (err) {
        console.error(err);
    }
})();

if (process.env.NODE_ENV == 'production') {
    app.set('port', process.env.PORT || 80);
    app.enable('trust proxy');
    app.use(morgan('combined'));
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
    }));
    app.use(hpp());
} else {
    app.set('port', process.env.PORT || 8080);
    app.use(morgan('dev'));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded( { extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
const sessionOption = {
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: true,
        secure: false,
    },
    store: new RedisStore({ 
        client: redisClient, 
        prefix: 'session:',
      }),
};
if (process.env.NODE_ENV === 'production') {
    sessionOption.proxy = true;
}
app.use(session(sessionOption));
app.use(passport.initialize()); //passport.initialize()는 반드시 session밑에 호출해야함. (req.user, req.login, req.isAuthenticate, req.logout)
app.use(passport.session());    //connect.sid라는 이름으로 세션 쿠키가 브라우저에 전송

app.use('/', pageRouter);
app.use('/auth', authRouter);
app.use('/post', postRouter);
app.use('/user', userRouter);

app.use((req, res, next) => {   //404 NOT FOUND
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;