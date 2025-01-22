# 노드버드 SNS
## 1. 패키지 설치
### 시퀄라이즈 및 MySQL 드라이버 설치
```
npm i sequelize mysql2 sequelize-cli
npx sequelize init
```
### 각종 패키지 설치
```
npm i express cookie-parser express-session morgan multer dotenv nunjucks
npm i -D nodemon
```
### passport 설치
```
npm i passport passport-local passport-kakao
```

-----------------

## 2. 라이프사이클
<details>
  <summary> app.js </summary>

  ```js
  const express = require('express');
  const cookieParser = require('cookie-parser');
  const morgan = require('morgan');
  const path = require('path');
  const session = require('express-session');
  const nunjucks = require('nunjucks');
  const dotenv = require('dotenv');
  const passport = require('passport');
  const { sequelize } = require('./models');
  
  dotenv.config();
  const pageRouter = require('./routes/page');
  const authRouter = require('./routes/auth');
  const passportConfig = require('./passport');
  
  const app = express();
  passportConfig();
  app.set('port', process.env.PORT || 8001);
  app.set('view engine', 'html');
  nunjucks.configure('views', {
      express: app,
      watch: true,
  });
  // sequelize.sync({ force: false })    //sync( {force: true}) 는 재시작 시 데이터베이스를 초기화하고 다시 실행 (개발시에만 사용할 것)
  //         .then(() => {
  //             console.log('데이터베이스 연결 성공');
  //         })
  //         .catch((err) => {
  //             console.error(err);
  //         });
  
  (async () => {
      try {
          await sequelize.sync({ force: false });
          console.log('데이터베이스 연결 성공');
      } catch (err) {
          console.error(err);
      }
  })();
  
  app.use(morgan('dev'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());
  app.use(express.urlencoded( { extended: false }));
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(session({
      resave: false,
      saveUninitialized: false,
      secret: process.env.COOKIE_SECRET,
      cookie: {
          httpOnly: true,
          secure: false,
      }
  }));
  app.use(passport.initialize()); //passport.initialize()는 반드시 session밑에 호출해야함. (req.user, req.login, req.isAuthenticate, req.logout)
  app.use(passport.session());    //connect.sid라는 이름으로 세션 쿠키가 브라우저에 전송
  
  app.use('/', pageRouter);
  app.use('/auth', authRouter);
  app.use((req, res, next) => {   //404 NOT FOUND
      const error = new Error(`${req.mathod} ${req.url} 라우터가 없습니다.`);
      error.status = 404;
      next(error);
  });
  app.use((err, req, res, next) => {
      res.locals.message = err.message;
      res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
      res.status(err.status || 500);
      res.render('error');
  });
  
  app.listen(app.get('port'), () => {
      console.log(app.get('port'), '번 포트에서 실행 중');
  });
```
</details>

### 2.1. app.js의 흐름
#### 2.1.1 모듈 및 환경설정 로드
```js
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const passport = require('passport');
const { sequelize } = require('./models');
```
- Node.js가 스크립트를 시작하자마자, 필요한 라이브러리(Express, Sequelize, Passport 등)와 dotenv를 불러옵니다.

```js
dotenv.config();
```
- .env 파일을 읽어 환경변수를 설정합니다. (process.env.* 로 접근 가능)

```js
const pageRouter = require('./routes/page');
const authRouter = require('./routes/auth');
const passportConfig = require('./passport');
```
- 직접 만든 라우터(./routes)들과 Passport 설정(./passport)을 불러옵니다(단순히 require 단계).

#### 2.1.2. Express 앱 생성 및 Passport 초기 설정
```js
const app = express();
passportConfig();
```
- express()를 통해 Express 애플리케이션 인스턴스(app) 를 만듭니다.
- passportConfig()를 실행하여 Passport에 필요한 Strategy와 serializeUser, deserializeUser 등의 설정 로직을 수행합니다.
  + 이 단계에서 “서버 실행 시점에 한 번” Passport가 내부적으로 초기화된다고 볼 수 있습니다. (주의: 아직 app.use(passport.initialize())는 아래에서 등록됩니다.)

#### 2.1.3. 서버 포트 및 템플릿 엔진 설정
```js
app.set('port', process.env.PORT || 8001);
app.set('view engine', 'html');
nunjucks.configure('views', {
  express: app,
  watch: true,
});
```
- Express에 포트 번호를 저장하고(나중에 app.listen 할 때 사용),
- 템플릿 엔진으로 nunjucks(HTML 렌더링)를 연결합니다.

#### 2.1.4. DB 동기화 (sequelize.sync)
```js
(async () => {
  try {
    await sequelize.sync({ force: false });
    console.log('데이터베이스 연결 성공');
  } catch (err) {
    console.error(err);
  }
})();
```
- **IIFE(즉시실행함수)** 안에서 await sequelize.sync(...)를 호출합니다.
- 여기서 테이블 생성/동기화를 진행한 뒤, DB 연결에 성공하면 콘솔에 알림을 찍습니다.
- 이 비동기 과정이 완료되어야 모델들이 준비되어, 서버가 정상적으로 DB를 사용할 수 있게 됩니다.

#### 2.1.5. 공통 미들웨어 등록
```js
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: { httpOnly: true, secure: false },
}));
```
- **morgan(‘dev’):** 모든 요청에 대해 콘솔에 로그를 찍어 줍니다.
- **express.static(…):** public 폴더 내부 정적 파일(이미지, CSS, JS 등)을 자동으로 서빙합니다.
- **express.json() / express.urlencoded(…):** JSON / 폼 데이터(POST) 파싱을 도와주는 미들웨어입니다.
- **cookieParser:** 클라이언트로부터 쿠키를 파싱합니다.
- **session:** 세션을 활성화하여 connect.sid 쿠키를 발급합니다.

#### 2.1.6. Passport 미들웨어 등록
```js
app.use(passport.initialize()); 
app.use(passport.session());
```
- **passport.initialize():** Passport 구동을 위한 기초 미들웨어. 요청 객체(req)에 login, logout, isAuthenticated 등의 메서드를 추가합니다.
- **passport.session():** 세션 기반 인증을 도와주는 미들웨어로, 요청마다 serializeUser/deserializeUser 과정을 통해 req.user를 세팅해 줍니다.
- 이 두 줄이 실행되어야 Passport를 통한 인증 로직이 라우터에서 제대로 동작하게 됩니다.

#### 2.1.7. 라우터 등록
```js
app.use('/', pageRouter);
app.use('/auth', authRouter);
```
- 기본 경로 **'/'**에 대해 pageRouter 를 사용하고,
- '/auth' 경로에는 authRouter를 사용합니다.
- 이 시점부터 GET /, POST /auth/login, 등등 라우팅 로직이 동작합니다.

#### 2.1.8. 404 에러 처리 미들웨어
```js
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error);
});
```
- 여기까지 정의된 모든 라우터를 거쳤는데도 매칭되는 라우터가 없으면, 이 미들웨어가 호출됩니다.
- next(error)로 넘어감으로써 다음 에러 처리 미들웨어로 이어집니다.

#### 2.1.9. 에러 처리 미들웨어
```js
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
```
- 에러 핸들러로, 위에서 next(error) 가 호출되면 이 블록으로 들어옵니다.
- res.locals에 에러 메시지, 스택 등을 담아 views/error.html 템플릿으로 렌더링합니다.
- 개발 환경이 아니면(production), 에러 스택 정보를 숨기는 방식으로 처리할 수 있습니다.

#### 2.1.10. 서버 실행 (app.listen)
```js
app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 실행 중');
});
```
- 위 모든 설정(미들웨어, 라우터, DB 등)이 끝난 뒤, 지정된 포트로 서버를 시작(listen)합니다.
- 이제 클라이언트가 포트 8001(또는 지정된 포트)로 요청을 보내면, 정의된 라우터와 미들웨어가 순차적으로 처리됩니다.

### 2.2. '/' 기본경로 라우터 이동
<img width="842" alt="image" src="https://github.com/user-attachments/assets/e9d46131-2004-4ed5-8298-d7e5a6334847" />

#### 2.2.1. '/' 경로 브라우저 접속
```
http://localhost:8001/
```
- 해당 URL 경로를 브라우저에 입력

#### 2.2.2. app.js '/' 라우터 실행
```js
app.use('/', pageRouter);
```
- app.js의 '/'경로의 pageRouter가 실행된다.

#### 2.2.3. routes/page.js 라우터 실행
```js
const { renderProfile, renderJoin, renderMain } = require('../controllers/page');
```
- 라우터를 실행하는 renderMain 컨트롤러를 가져온다.

```js
router.use((req, res, next) => {    //라우터에서 공통적으로 쓰는 것들
    res.locals.user = req.user;
    res.locals.followerCount = 0;
    res.locals.followingCount = 0;
    res.locals.followingIdList = [];
    next();
});
```
- 공통라우터 실행 부분은 로그인 여부에 따라 req.user가 달라진다. (로그인 하지 않을 경우 null)

```js
router.get('/', renderMain);
```
- '/' 경로로 호출 시renderMain 컨트롤러를 실행한다.

#### 2.2.4. controllers/page.js 라우터 실행
```js
exports.renderMain = (req, res, next) => {
    res.render('main', { 
        title: 'NodeBird',
        twits: [],
    });
};
```
- page.js 내의 exports한 renderMain이 호출되며, 'main'이라는 이름의 html을 views에서 호출한다.

### 2.3. 회원가입
<img width="827" alt="image" src="https://github.com/user-attachments/assets/079cb6cf-e82d-4976-a5cc-ef029a205866" />

#### 2.3.1. 메인에서 회원가입 버튼 클릭 (회원가입 화면 렌더)
##### 1. views/layout.html 내의 회원가입 버튼을 통해 '/join' 경로 호출

##### 2. app.js 내의 page 라우터 실행
```js
app.use('/', pageRouter);
```

###### 3. routes/page.js 내의 renderJoin 컨트롤러 호출
```js
router.get('/join', isNotLoggedIn, renderJoin);
```

##### 4. views/join.html 호출
```js
exports.renderJoin = (req, res, next) => {
    res.render('join', { title: '회원 가입 - NodeBird' });
};
```

#### 2.3.2. 회원가입 정보 입력 후 '회원가입' 버튼 클릭
##### 1. 회원가입 버튼 클릭 시 '/auth/join' 경로 실행 (views/join.html)
##### 2. app.js 의 /auth authRouter 라우터 실행
```js
app.use('/auth', authRouter);
```
##### 3. routes/auth.js 내의 POST 라우터 실행
```js
router.post('/join', isNotLoggedIn, join);
```
##### 4. controllers/auth.js 내의 join 실행
```js
exports.join = async (req, res, next) => {
    const { nick, email, password } = req.body; //app.js 의 express.urlencoded에 의해 views - join의 form을 body에서 꺼내쓸 수 있음
    try {
        const exUser = await User.findOne({ where: { email } });
        if(exUser) {
            return res.redirect('/join?error=exist');
        }
        const hash = await bcrypt.hash(password, 12);
        await User.create({
            email,
            nick,
            password: hash,
        });
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
}
```
req.body 를 구조분해할당을 진행하여 nick,email,password로 받아온 뒤, User DB에서 email과 일치하는 첫 번째 유저를 가져온다.
회원가입이기 때문에 유저가 있는 경우는 redirect를 진행하며, 없는 경우엔 password를 암호화하고 **'User.create'** 로 유저 Row를 생성한다.
생성 후 redirect로 '/' 경로로 이동시킨다.
 
### 2.4. 이메일 로그인
#### 2.4.1. 첫 로그인


#### 2.4.2. 로그인 이후

### 2.5. 카카오 로그인
