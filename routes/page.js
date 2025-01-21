const express = require('express');
const router = express.Router();
const { renderProfile, renderJoin, renderMain } = require('../controllers/page');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares/index');

router.use((req, res, next) => {    //라우터에서 공통적으로 쓰는 것들
    res.locals.user = req.user;
    res.locals.followerCount = 0;
    res.locals.followingCount = 0;
    res.locals.followingIdList = [];
    next();
});

router.get('/profile', isLoggedIn, renderProfile);  // renderProfile 같은 것들은 컨트롤러라 불림
router.get('/join', isNotLoggedIn, renderJoin);
router.get('/', renderMain);

module.exports = router;