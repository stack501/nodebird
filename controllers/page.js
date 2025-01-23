const Hashtag = require("../models/hashtag");
const Post = require("../models/post");
const User = require("../models/user");

exports.renderProfile = (req, res, next) => {
    //서비스를 호출
    res.render('profile', { title: '내 정보 - NodeBird' });
};
exports.renderJoin = (req, res, next) => {
    res.render('join', { title: '회원 가입 - NodeBird' });
};
exports.renderMain = async (req, res, next) => {
    try {
        const posts = await Post.findAll({
            include: {
                model: User,
                attributes: ['id', 'nick'],
            },
            order: [['createdAt', 'DESC']]
        });
        res.render('main', { 
            title: 'NodeBird',
            twits: posts,
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

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