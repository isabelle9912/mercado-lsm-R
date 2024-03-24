const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("mercado", "mercado_owner", "AcvWy40VRXSp", {
  host: "ep-lively-morning-a5vv77ft.us-east-2.aws.neon.tech",
  dialect: "postgres",
});

try {
  sequelize.authenticate();
  console.log("Conectado com o banco!");
} catch (error) {
  console.log(`Não foi possível conectar: ${error}`);
}

module.exports = sequelize;
