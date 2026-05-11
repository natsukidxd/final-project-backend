import { Sequelize, DataTypes } from 'sequelize';
import { initAccountModel } from '../accounts/account.model';
import { initRefreshTokenModel } from '../accounts/refresh-token.model';
import dotenv from 'dotenv';

dotenv.config();

let sequelize: Sequelize;

if (process.env.DATABASE_URL) {
  // Remote (Supabase / DATABASE_URL provided)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: { rejectUnauthorized: false },
      family: 4
    },
    logging: false,
    native: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // Local PostgreSQL fallback
  sequelize = new Sequelize('postgres', 'postgres', 'root', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false,
    native: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

const db: any = {
  sequelize,
  Sequelize,
  DataTypes
};

// Initialize models
db.Account = initAccountModel(sequelize, DataTypes);
db.RefreshToken = initRefreshTokenModel(sequelize, DataTypes);

// Define relationships
db.Account.hasMany(db.RefreshToken, { foreignKey: 'accountId', onDelete: 'CASCADE' });
db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId' });

export { db };
export default db;