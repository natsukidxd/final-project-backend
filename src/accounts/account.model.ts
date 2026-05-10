import { Sequelize, DataTypes, Model } from 'sequelize';

export interface AccountAttributes {
  id?: number;
  email: string;
  passwordHash: string;
  title?: string;
  firstName: string;
  lastName: string;
  role: string;
  verified?: Date;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  passwordReset?: Date;
  created?: Date;
  updated?: Date;
}

export class Account extends Model<AccountAttributes> implements AccountAttributes {
  declare id: number;
  declare email: string;
  declare passwordHash: string;
  declare title: string;
  declare firstName: string;
  declare lastName: string;
  declare role: string;
  declare verified: Date;
  declare verificationToken: string;
  declare resetToken: string;
  declare resetTokenExpires: Date;
  declare passwordReset: Date;
  declare created: Date;
  declare updated: Date;

  get isVerified(): boolean {
    return !!this.verified;
  }
}

export function initAccountModel(sequelize: Sequelize, DataTypes: any): typeof Account {
  const modelOptions = {
    sequelize,
    tableName: 'accounts' as const,
    timestamps: true,
    createdAt: 'created' as const,
    updatedAt: 'updated' as const,
    defaultScope: {
      attributes: { exclude: ['passwordHash'] }
    },
    scopes: {
      withHash: {
        attributes: { include: ['passwordHash'] }
      }
    }
  };

  Account.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'User'
    },
    verified: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordReset: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, modelOptions);

  return Account;
}