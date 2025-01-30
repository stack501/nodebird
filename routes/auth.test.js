const app = require('../app');
const request = require('supertest');
const { sequelize } = require('../models');

beforeAll(async () => {
    await sequelize.sync( { force : true });
});

describe('POST join', () => {
    test('로그인 안했으면 가입', (done) => {
        request(app).post('/auth/join')
        .send({
            email: 'test@naver.com',
            nick: 'junny',
            password: '1234'
        })
        .expect('Location', '/')
        .expect(302, done);
    });

    test('회원가입 이미 했는데 또 하는 경우', (done) => {
        request(app).post('/auth/join')
        .send({
            email: 'test@naver.com',
            nick: 'junny',
            password: '1234'
        })
        .expect('Location', '/join?error=exist')
        .expect(302, done);
    });
});

describe('POST join', () => {
    const agent = request.agent(app);

    beforeEach((done) => {
        agent.post('/auth/login')
        .send({
            email: 'test@naver.com',
            password: '1234'
        })
        .end(done);  
    });
    
    test('로그인했으면 회원가입 진행이 되지 않아야함 ', (done) => {
        const message = encodeURIComponent('로그인한 상태입니다.');
        agent.post('/auth/join')
        .send({
            email: 'test@naver.com',
            nick: 'junny',
            password: '1234'
        })
        .expect('Location', `/?error=${message}`)
        .expect(302, done);
    });
});

describe('POST login', () => {
    test('로그인 수행', (done) => {
        request(app).post('/auth/login')
        .send({
            email: 'test@naver.com',
            password: '1234'
        })
        .expect('Location', '/')
        .expect(302, done);
    });

    test('가입되지 않은 회원', (done) => {
        const message = '가입하지 않은 회원입니다.';
        request(app).post('/auth/login')
        .send({
            email: 'test1234@naver.com',
            password: '1234'
        })
        .expect('Location', `/?loginError=${encodeURIComponent(message)}`)
        .expect(302, done);
    });

    test('비밀번호 틀림', (done) => {
        const message = '비밀번호가 일치하지 않습니다.';
        request(app).post('/auth/login')
        .send({
            email: 'test@naver.com',
            password: '454545'
        })
        .expect('Location', `/?loginError=${encodeURIComponent(message)}`)
        .expect(302, done);
    });
});