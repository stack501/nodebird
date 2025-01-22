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