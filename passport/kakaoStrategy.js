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