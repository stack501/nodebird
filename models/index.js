const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');
const { modelName } = require('../../10_mongoose/schemas/comment');

const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.json')[env];
const db = {};
const sequelize = new Sequelize(
    config.database, config.username, config.password, config,
);
db.sequelize = sequelize;

const basename = path.basename(__filename); //index.js
fs.readdirSync(__dirname)
    .filter(file => {
      //file.index('.') 은 숨기파일 제외 (.env같은 파일이 숨김파일)
      //index.js 제외
      //파일의 마지막 세자리가 .js 인 경우만 (js파일인 경우만)
      return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
    })
    .forEach((file) => {
      const model = require(path.join(__dirname, file));
      console.log(file, model.name);
      db[model.name] = model;
      model.initiate(sequelize);
    });

Object.keys(db).forEach(modelName => {
  console.log(db, modelName);
  if (db[modelName].associate){
    db[modelName].associate(db);
  }
});

module.exports = db;