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
- Node.js가 스크립트를 시작하자마자, 필요한 라이브러리(Express, Sequelize, Passport 등)와 dotenv를 불러온다.

```js
dotenv.config();
```
- .env 파일을 읽어 환경변수를 설정한다. (process.env.* 로 접근 가능)

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
- express()를 통해 Express 애플리케이션 인스턴스(app) 를 만든다.
- passportConfig()를 실행하여 Passport에 필요한 Strategy와 serializeUser, deserializeUser 등의 설정 로직을 수행한다.
  + 이 단계에서 “서버 실행 시점에 한 번” Passport가 내부적으로 초기화된다고 볼 수 있다. (주의: 아직 app.use(passport.initialize())는 아래에서 등록된다.)

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
- **IIFE(즉시실행함수)** 안에서 await sequelize.sync(...)를 호출한다.
- 여기서 테이블 생성/동기화를 진행한 뒤, DB 연결에 성공하면 콘솔에 알림을 찍는다.
- 이 비동기 과정이 완료되어야 모델들이 준비되어, 서버가 정상적으로 DB를 사용할 수 있게 된다.

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
- **morgan(‘dev’):** 모든 요청에 대해 콘솔에 로그를 찍어 준다.
- **express.static(…):** public 폴더 내부 정적 파일(이미지, CSS, JS 등)을 자동으로 서빙한다.
- **express.json() / express.urlencoded(…):** JSON / 폼 데이터(POST) 파싱을 도와주는 미들웨어이다.
- **cookieParser:** 클라이언트로부터 쿠키를 파싱한다.
- **session:** 세션을 활성화하여 connect.sid 쿠키를 발급한다.

#### 2.1.6. Passport 미들웨어 등록
```js
app.use(passport.initialize()); 
app.use(passport.session());
```
- **passport.initialize():** Passport 구동을 위한 기초 미들웨어. 요청 객체(req)에 login, logout, isAuthenticated 등의 메서드를 추가한다.
- **passport.session():** 세션 기반 인증을 도와주는 미들웨어로, 요청마다 serializeUser/deserializeUser 과정을 통해 req.user를 세팅해 준다.
- 이 두 줄이 실행되어야 Passport를 통한 인증 로직이 라우터에서 제대로 동작하게 된다.

#### 2.1.7. 라우터 등록
```js
app.use('/', pageRouter);
app.use('/auth', authRouter);
```
- 기본 경로 **'/'**에 대해 pageRouter 를 사용하고,
- '/auth' 경로에는 authRouter를 사용한다.
- 이 시점부터 GET /, POST /auth/login, 등등 라우팅 로직이 동작한다.

#### 2.1.8. 404 에러 처리 미들웨어
```js
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error);
});
```
- 여기까지 정의된 모든 라우터를 거쳤는데도 매칭되는 라우터가 없으면, 이 미들웨어가 호출된다.
- next(error)로 넘어감으로써 다음 에러 처리 미들웨어로 이어진다.

#### 2.1.9. 에러 처리 미들웨어
```js
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
```
- 에러 핸들러로, 위에서 next(error) 가 호출되면 이 블록으로 들어온다.
- res.locals에 에러 메시지, 스택 등을 담아 views/error.html 템플릿으로 렌더링한다.
- 개발 환경이 아니면(production), 에러 스택 정보를 숨기는 방식으로 처리할 수 있다.

#### 2.1.10. 서버 실행 (app.listen)
```js
app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 실행 중');
});
```
- 위 모든 설정(미들웨어, 라우터, DB 등)이 끝난 뒤, 지정된 포트로 서버를 시작(listen)한다.
- 이제 클라이언트가 포트 8001(또는 지정된 포트)로 요청을 보내면, 정의된 라우터와 미들웨어가 순차적으로 처리된다.

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
##### 3. routes/auth.js 내의 join 라우터 실행
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
<img width="301" alt="image" src="https://github.com/user-attachments/assets/008c1f88-d74e-487b-8c54-a57d1361fa83" />

#### 2.4.1. 첫 로그인
##### 1. passport/index.js 실행
```js
const passportConfig = require('./passport');
passportConfig();
```
passport의 index.js 에 접근하여 passprotConfig() 즉, 해당 모듈을 실행한다.

##### 2. passport/index.js 내의 local() 실행
```js
const passport = require('passport');
const local = require('./localStrategy');
const kakao = require('./kakaoStrategy');
const User = require('../models/user');

module.exports = () => {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        (async () => {
            try{
                const user = await User.findOne({where: { id }});
                done(null, user);
            } catch(err) {
                done(err);
            }
        })();
    });

    local();
}
```
local()이 실행되며 localStrategy.js 내의 모듈이 실행된다.

##### 3. passport/localStrategy.js 내의 모듈 실행
```js
const passport = require("passport");
const bcrypt = require('bcrypt');
const { Strategy: LocalStorage } = require('passport-local');
const User = require("../models/user");

module.exports = () => {
    passport.use(new LocalStorage({
        usernameField: 'email', //req.body.email
        passwordField: 'password',  //req.body.password
        passReqToCallback: false,   //async (req, email, password, done) req를 넣을지말지 여부
    }, async (email, password, done) => {
        try {
            const exUser = await User.findOne({ where: { email } });
            if(exUser) {
                const isResult = await bcrypt.compare(password, exUser.password);
                if(isResult) {
                    done(null, exUser);
                } else {
                    done(null, false, { message : '비밀번호가 일치하지 않습니다.' });
                }
            } else {
                done(null, false, { message : '가입하지 않은 회원입니다.' });
            }
        } catch (error) {
            console.error(error);
            done(error);
        }
    }));
};
```
passport.use 의 첫 번째 인자인 new LocalStorage는 서버 구동 시점에 passport.use(...)를 호출해서 LocalStrategy(‘local’이라는 이름의 전략)을 “등록”한다.
이때 “검증 콜백 함수” 자체는 메모리에 올라가 Passport가 관리하게 되고, “즉시 실행”되지는 않는다. (두 번째 인자)

##### 4. app.js 내의 passport.initialize()를 통해 실제 Express 요청 파이프라인에 Passport를 결합
- 이걸 하지 않으면, passport.authenticate()를 호출해도 요청 데이터가 파싱되지 않거나, req 객체에 인증 관련 메서드들이 없어서 제대로 작동하지 않는다.
  
##### 5. 로그인 버튼 클릭 시 '/auth/login' 라우터 실행
##### 6. app.js 의 /auth authRouter 라우터 실행
```js
app.use('/auth', authRouter);
```
##### 7. routes/auth.js 내의 login 라우터 실행
```js
router.post('/login', isNotLoggedIn, login);
```
##### 8. controllers/auth.js 내의 login 실행
```js
exports.login = (req, res, next) => {
    //두 번째 인자는 'passport - localStrategy.js의 done에서 온다.
    passport.authenticate('local', (authError, user, info) => {
        if(authError) { //서버 실패1
            console.error(authError);
            return next(authError);
        }

        if(!user) { //로직 실패
            return res.redirect(`/?loginError=${info.message}`);
        }

        return req.login(user, (loginError) => {
            if(loginError) {
                console.error(loginError);
                return next(loginError);
            }

            return res.redirect('/');
        });
    })(req, res, next);
}
```
passport.authenticate는 app.js에서 passportConfig()를 통해 localStrategy를 등록하고, passport.initialize()를 통해 사용할 수 있게 되었다.
그리고 첫 번째 인자인 'local'을 만나게 되면 passport/localStrategy.js 의 모듈의 두 번째 인자(콜백)가 실행된다.

##### 9. passport/localStrategy.js 검증 콜백 함수 실행
```js
module.exports = () => {
    passport.use(new LocalStorage({
        usernameField: 'email', //req.body.email
        passwordField: 'password',  //req.body.password
        passReqToCallback: false,   //async (req, email, password, done) req를 넣을지말지 여부
    }, async (email, password, done) => {
        try {
            const exUser = await User.findOne({ where: { email } });
            if(exUser) {
                const isResult = await bcrypt.compare(password, exUser.password);
                if(isResult) {
                    done(null, exUser);
                } else {
                    done(null, false, { message : '비밀번호가 일치하지 않습니다.' });
                }
            } else {
                done(null, false, { message : '가입하지 않은 회원입니다.' });
            }
        } catch (error) {
            console.error(error);
            done(error);
        }
    }));
};
```
두 번째 인자인 async 부분이 실행되며, User DB에서 email과 일치한 유저 한명을 가져온다.
유저가 존재하면 암화호 비교를 진행하며, 비밀번호가 일치할 경우 done(null, exUser)를 통해 다시 **'controllers/auth.js'의 모듈**로 이동한다.

##### 10. controllers/auth.js 의 두 번째 미들웨어 실행
```js
exports.login = (req, res, next) => {
    //두 번째 인자는 'passport - localStrategy.js의 done에서 온다.
    passport.authenticate('local', (authError, user, info) => {
        if(authError) { //서버 실패1
            console.error(authError);
            return next(authError);
        }

        if(!user) { //로직 실패
            return res.redirect(`/?loginError=${info.message}`);
        }

        return req.login(user, (loginError) => {
            if(loginError) {
                console.error(loginError);
                return next(loginError);
            }

            return res.redirect('/');
        });
    })(req, res, next);
}
```
done(null, exUser)가 passport.authenticate()의 두 번째 인자로 받아와서 실행된다.
최종적으로 req.login이 실행되어 로그인을 실행한다.

#### 11. passport/index.js 의 serializeUser 실행
```js
passport.serializeUser((user, done) => {
        done(null, user.id);
    });
```
- 로그인 성공 시 (ex. LocalStrategy에서 done(null, user)를 반환한 시점) → serializeUser가 호출됨.
- 이 때 serializeUser((user, done) => { ... }) 내부에서 done(null, user.id) 라고 호출하게 되면, 유저의 식별자(여기서는 user.id)만을 세션에 저장한다.
  + 즉, 실제로 세션에는 user.id라는 키(또는 식별값)만 저장되며, 필요하다면 DB에서 유저 정보를 다시 찾아오는 과정을 거치게 된다(이 과정이 deserializeUser).

#### 2.4.2. 로그인 이후 요청
##### 1. 요청마다 passport/index.js 의 deserializeUser 실행
```js
    passport.deserializeUser((id, done) => {
        (async () => {
            try{
                const user = await User.findOne({where: { id }});
                done(null, user);
            } catch(err) {
                done(err);
            }
        })();
    });
```
새 요청(Request)이 들어올 때마다, Passport는 세션에서 user.id를 읽고 deserializeUser를 호출
-> DB에서 해당 id로 유저 정보를 조회 → req.user에 유저 정보를 담음

##### 2. routes/page.js 공용 미들웨어 실행
```js
router.use((req, res, next) => {    //라우터에서 공통적으로 쓰는 것들
    res.locals.user = req.user;
    res.locals.followerCount = 0;
    res.locals.followingCount = 0;
    res.locals.followingIdList = [];
    next();
});
```
1번에서 req에 유저정보를 담았으므로 req.user는 이미 로그인한 사용자이다.

### 2.5. 로그아웃
<img width="298" alt="image" src="https://github.com/user-attachments/assets/86db2f46-d6d0-4c39-a1f8-adf679070fd8" />

#### 2.5.1 로그아웃 버튼 클릭 시 /auth/logout 실행
#### 2.5.2. 각종 passport 세팅 후 routes/auth.js 의 logout 라우터 실행
```js
router.get('/logout', isLoggedIn, logout);
```
#### 2.5.3. controllers/auth.js 의 logout 컨트롤러 실행
```js
exports.logout = (req, res, next) => {
    req.logout(() => {
        res.redirect('/');
    });
```
세션에서 사용자 정보(req.user) 만 제거(혹은 무효화)된다.
즉, 로그인 시점에 세션 안에 저장해둔 user 프로퍼티를 지워, 이후 요청에서 req.isAuthenticated() 등이 false를 반환하도록 만드는 것이 핵심이다.

### 2.6. 카카오 로그인
![image](https://github.com/user-attachments/assets/615f6dde-4b2e-4cea-bdfd-f301d33949ff)
#### [카카오 개발자 센터](https://developers.kakao.com/) 에서 설정
<img width="913" alt="image" src="https://github.com/user-attachments/assets/d3cac25c-e19b-4f8c-bb89-c74e4d450534" />
= 내 애플리케이션에서 생성 후
<img width="856" alt="image" src="https://github.com/user-attachments/assets/5e6d630c-fcc6-4e27-8b77-07d8a14d68e0" />
- **앱키 항목에서 REST API 키를 '.env' 파일에 넣어준다.**
<img width="900" alt="image" src="https://github.com/user-attachments/assets/cf94e9c2-c5f1-4cdb-bc2c-a614cb8817f2" />
- 플랫폼에 웹 사이트 도메인을 등록한다.
<img width="726" alt="image" src="https://github.com/user-attachments/assets/7ed75336-a1f9-4a2c-90fe-977c5380d5b7" />
- 카카오 로그인 항목에서 **카카오 로그인** 을 활성화한다.
<img width="920" alt="image" src="https://github.com/user-attachments/assets/f28214fe-bd1a-4ba5-8302-8a6aa9c2b99d" />
- 마찬가지로 카카오 로그인 항목에서 Redirect URI를 설정한다.
<img width="910" alt="image" src="https://github.com/user-attachments/assets/938dfc64-b73d-4ba1-b82b-c6cb7d4fbd21" />
- 마지막으로 동의 항목을 설정하면 완료

#### 2.6.1. passport/index.js 의 kakao() 호출하여 kakaoStrategy 등록
#### 2.6.2. kakaoStrategy 미들웨어 실행
```js
const passport = require("passport");
const { Strategy: KakaoStrategy } = require('passport-kakao');
const User = require("../models/user");

module.exports = () => {
    passport.use(new KakaoStrategy({
        clientID: process.env.KAKAO_ID,
        callbackURL: '/auth/kakao/callback',
    }, async (accessToken, refreshToken, profile, done) => {
        console.log('profile', profile);
        try {
            const exUser = await User.findOne({
                where : { snsId: profile.id, provider: 'kakao' }
            });
            if(exUser) {
                done(null, exUser);
            } else {
                //회원 가입
                const newUser = User.create({
                    email: profile._json?.kakao_accout?.email,
                    nick: profile.displayName,
                    snsId: profile.id,
                    provider: 'kakao',
                });
                done(null, newUser);
            }
        } catch (error) {
            console.error(error);
            done(error);
        }
    }));
};
```
#### 2.6.3. 사용자가 카카오 로그인 버튼 클릭
#### 2.6.4. routes/auth.js '/kakao' 라우터 실행
```js
//GET /auth/kakao
router.get('/kakao', passport.authenticate('kakao'));
```
해당 라우터 요청하면 passport가 카카오 로그인 페이지로 이동한다.

#### 2.6.5. 카카오 로그인 페이지로 이동
passport가 카카오 로그인 페이지로 이동한다. 이곳에서 동의하면 다음으로 이동한다.

#### 2.6.6. 사용자 로그인 후 → 카카오가 **/auth/kakao/callback**으로 리다이렉트
```js
//GET /auth/kakao/callback
router.get('/kakao/callback', passport.authenticate('kakao', {
    failureRedirect: '/?loginError=카카오로그인 실패',
}), (req, res) => {
    res.redirect('/');
});
```
카카오 로그인 페이지에서 동의하면 카카오측에서 **routes/auth.js의 /auth/kakao/callback** 으로 리다이렉트한다.

#### 2.6.7. KakaoStrategy(passport.use)에서 profile 받아와 DB 검증/생성
```js
const passport = require("passport");
const { Strategy: KakaoStrategy } = require('passport-kakao');
const User = require("../models/user");

module.exports = () => {
    passport.use(new KakaoStrategy({
        clientID: process.env.KAKAO_ID,
        callbackURL: '/auth/kakao/callback',
    }, async (accessToken, refreshToken, profile, done) => {
        console.log('profile', profile);
        try {
            const exUser = await User.findOne({
                where : { snsId: profile.id, provider: 'kakao' }
            });
            if(exUser) {
                done(null, exUser);
            } else {
                //회원 가입
                const newUser = User.create({
                    email: profile._json?.kakao_accout?.email,
                    nick: profile.displayName,
                    snsId: profile.id,
                    provider: 'kakao',
                });
                done(null, newUser);
            }
        } catch (error) {
            console.error(error);
            done(error);
        }
    }));
};
```
이후 passport/kakaostrategy.js 의 '검증 콜백 함수' 부분이 실행되며 로그인을 진행하거나, 회원가입을 진행한다.

#### 2.6.8. 로그인 성공 시 /로, 실패 시 failureRedirect 경로로 이동

### 2.7. 게시글, 이미지 업로드하기
#### 2.7.1. 사진 업로드 시
<img width="507" alt="image" src="https://github.com/user-attachments/assets/f3983284-7bff-457b-b70d-d12126829d85" />
##### 1. 사진 업로드 시 app.js 에서 post 라우터 호출
views/main.html 의 axios.post('/post/img', formData) 를 통해 서버에 **'/post/img'** 라우터 호출한다.
```js
const postRouter = require('./routes/post');
app.use('/post', postRouter);
```
app.js 에서는 post 라우터를 호출한다.

##### 2. routes/post.js 의 '/img' 라우터를 실행한다.
```js
try {
    fs.readdirSync('uploads');
} catch(error) {
    fs.mkdirSync('uploads');
}

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, 'uploads/');
        },
        filename (req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
        }
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
});

router.post('/img', isLoggedIn, upload.single('img'), afterUploadImage);
```
해당 라우터는 사용자가 로그인이 되어있어야하는 상태이므로 **'isLoggedIn'** 를 호출하며, multer를 통해 이미지를 서버로 업로드해야하므로 **upload.single('img')** 를 호출하며,
**controllers/post.js** 에서 afterUploadImage 모듈을 호출한다.

##### 3. controllers/post.js 의 afterUploadImage 호출
```js
exports.afterUploadImage = (req, res) => {
    console.log(req.file);
    res.json({ url: `/img/${req.file.filename}` });
}
```
이미지 업로드가 끝난 직후 클라이언트(브라우저 등)에게 업로드 결과를 알려주는 역할한다.

#### 2.7.2. 게시글 업로드 시
##### 1. 게시글 업로드 시 app.js 에서 post 라우터 호출
##### 2. routes/post.js 의 '/' 라우터를 실행한다.
```js
const upload2 = multer();
router.post('/', isLoggedIn, upload2.none(), uploadPost);
```
라우터의 uploadPost 모듈이 실행된다.
##### 3. controllers/post.js 의 afterUploadImage 호출
```js
exports.uploadPost = async (req ,res ,next) => {
    try {
        const post = await Post.create({
            content: req.body.content,
            img: req.body.url,
            UserId: req.user.id
        });
        const hashtags = req.body.content.match(/#[^\s#]*/g);
        if(hashtags) {
            const result = await Promise.all(hashtags.map((tag) => {
                return Hashtag.findOrCreate({
                    where: { title: tag.slice(1).toLowerCase() }
                });
            }));
            console.log('result', result);

            await post.addHashtags(result.map(r => r[0]));
        }
        res.redirect('/');
    } catch (error) {
        console.error(error);
        next(error);
    }
}
```
###### 3.1. 새 게시글 생성
```js
const post = await Post.create({
  content: req.body.content,
  img: req.body.url,
  UserId: req.user.id
});
```
- Post.create 를 통해 DB의 Post 테이블에 새 레코드를 만든다.
  + content: 게시글 내용 (ex. “오늘 날씨 #Sunny”)
  + img: 업로드된 이미지 경로(혹은 URL)
  + UserId: 현재 로그인한 사용자의 ID (게시글 작성자)
- 결과로 post 라는 Sequelize 모델 인스턴스 가 반환된다.
  + 이후 post.addHashtags(...) 같은 관계 메서드를 호출할 수 있게 된다.
###### 3.2. 게시글 내용에서 해시태그 추출
```js
const hashtags = req.body.content.match(/#[^\s#]*/g);
```
- 정규식 /#[^\s#]*/g를 사용해, 게시글 내용에서 #으로 시작하는 문자열을 모두 찾아 배열로 반환한다.
###### 3.3. 해시태그 DB 등록 (findOrCreate)
```js
if (hashtags) {
  const result = await Promise.all(hashtags.map((tag) => {
    return Hashtag.findOrCreate({
      where: { title: tag.slice(1).toLowerCase() },
    });
  }));
  ...
}
```
- 해시태그 문자열 배열을 순회하며 Hashtag.findOrCreate 호출
- result 는 [[HashtagInstance, created], [HashtagInstance, created], ...] 형태의 배열
###### 3.4. 게시글 ↔ 해시태그 연결
```js
await post.addHashtags(result.map(r => r[0]));
```
- 다대다(Many-to-Many) 관계를 맺기 위해 post.addHashtags 메서드를 호출한다.
- addHashtags는 Sequelize가 belongsToMany 설정을 통해 자동 생성하는 관계 메서드이다.
- result.map(r => r[0]) 로 Hashtag 인스턴스만 추출한 뒤, 새로 만든 post와 연결한다.
- 내부적으로는 중간 테이블(예: PostHashtag)에 postId, hashtagId를 저장한다.
###### 3.5. 최종 응답
```js
res.redirect('/');
```

### 2.8. 팔로우 기능 만들기
<img width="310" alt="image" src="https://github.com/user-attachments/assets/3fb15aad-319f-4bd8-badf-91b154771f28" />

#### 2.8.1. 게시글의 팔로잉 버튼을 누를 시
```js
axios.post(`/user/${userId}/follow`)
```

#### 2.8.2. app.js의 user 라우터 호출
#### 2.8.3. routes/user.js 에서 라우터 호출
```js
const { follow } = require('../controllers/user');
router.post('/:id/follow', isLoggedIn, follow);
```
#### 2.8.4. controllers/user.js 에서 컨트롤러 호출
```js
const User = require("../models/user");

exports.follow = async (req ,res ,next) => {
    //req.user.id - 내 아이디
    //req.params.id - 내가 팔로잉하려는 사람 아이디
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if(user){
            await user.addFollowing(parseInt(req.params.id, 10));
            res.send('success');
        } else {
            res.status(404).send('no user');
        }
    } catch (error) {
        console.error(error);
        next(error);
    }
}
```
#### 2.8.5. views/main.html 에서 페이지 리다이렉션
```js
location.reload();
```
페이지 갱신.

### 2.9. 해시태그 검색 기능 만들기
<img width="351" alt="image" src="https://github.com/user-attachments/assets/b04acf95-9fde-41d4-9e7b-00ed7ddc102d" />

#### 2.9.1. 검색 요청
```js
<form id="hashtag-form" action="/hashtag">
```
사용자가 검색창에 원하는 해쉬태그를 입력 후 **'검색'** 버튼을 누를 시, **views/main.html 의 /hashtag** 서버에서 호출된다.

#### 2.9.2. app.js 의 page 라우터 호출
```js
app.use('/', pageRouter);
```

#### 2.9.3. routes/page.js 내의 renderHashtag 호출
```js
const { renderProfile, renderJoin, renderMain, renderHashtag } = require('../controllers/page');
router.get('/hashtag', renderHashtag);  //hashtag?hashtag=고양이
```
해당 라우터가 호출되면 **controllers/page.js 의 renderHashtag** 가 호출된다.

#### 2.9.4. controllers/page.js 의 renderHashtag 컨트롤러 호출
```js
exports.renderHashtag = async (req, res, next) => {
    const query = req.query.hashtag;
    if(!query) {
        return res.redirect('/');
    }

    try {
        const hashtag = await Hashtag.findOne({ where: { title: query } });
        let posts = [];
        if (hashtag) {
            posts = await hashtag.getPosts({
                include: [{
                    model: User,
                    attributes: ['id', 'nick'],
                }],
                order: [['createdAt', 'DESC']],
            });
        }
        res.render('main', {
            title: `${query} | NodeBird`,
            twits: posts,
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
}
```
Hashtag 테이블에서 query와 title이 같은 해쉬태크를 가져와서 **'views/main.html'** 에서 보여준다.
