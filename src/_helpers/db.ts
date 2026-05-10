import { Sequelize, DataTypes } from 'sequelize';
import { initAccountModel } from '../accounts/account.model';
import { initRefreshTokenModel } from '../accounts/refresh-token.model';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'postgres',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    dialectOptions: {
      ssl: { rejectUnauthorized: false },
      family: 4
    },
    logging: false,
    // Force IPv4 to avoid IPv6 timeout issues with Supabase
    native: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

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