const Sequelize = require('sequelize');

class User extends Sequelize.Model {
    static initiate(sequelize) {
        User.init({
            email: {
                type: Sequelize.STRING(40),
                allowNull: true,
                unique: true
            },
            nick: {
                type: Sequelize.STRING(15),
                allowNull: false,
            },
            password: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            provider: {
                type: Sequelize.ENUM('local', 'kakao'),
                allowNull: false,
                defaultValue: 'local',
            },
            snsId: {
                type: Sequelize.STRING(30),
                allowNull: true,
            }
        }, {
            sequelize,
            timestamps: true,   //createdAt, updatedAt 자동생성
            underscored: false, //false일 경우 캐멀케이스
            modelName: 'User',  //노드내의 코드에서 쓰는 이름
            tableName: 'users', //SQL의 테이블 이름
            paranoid: true, //deletedAt 추가 (삭제 시 deletedAt로 기록, 소프트딜리트)
            charset: 'utf8',
            collate: 'utf8_general_ci', //문자 정렬 방식
        });
    }

    static associate(db) {
        db.User.hasMany(db.Post);
        db.User.belongsToMany(db.User, {    //팔로워
            foreignKey: 'followingId',
            as: 'Followers',
            through: 'follow'   //중간테이블
        });
        db.User.belongsToMany(db.User, {    //팔로잉
            foreignKey: 'followerId',
            as: 'Followings',
            through: 'follow'   //중간테이블
        });
    }
}

module.exports = User;