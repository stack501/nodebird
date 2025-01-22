const express = require('express');
const { isLoggedIn } = require('../middlewares');
const router = express.Router();
const { follow } = require('../controllers/user');

router.post('/:id/follow', isLoggedIn, follow);

//TODO : 추후 구현
//router.post('/:id/unfollow', isLoggedIn, follow);

module.exports = router;