const { follow } = require('../services/user');

exports.follow = async (req ,res ,next) => {
    //req.user.id - 내 아이디
    //req.params.id - 내가 팔로잉하려는 사람 아이디
    try {
        const result = await follow(req.user.id, req.params.id);
        
        if(result === 'ok'){
            res.send('success');
        } else if(result === 'no user') {
            res.status(404).send('no user');
        }
    } catch (error) {
        console.error(error);
        next(error);
    }
}