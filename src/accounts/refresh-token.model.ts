import { Sequelize, DataTypes, Model } from 'sequelize';

export interface RefreshTokenAttributes {
  id?: number;
  accountId: number;
  token: string;
  expires: Date;
  created?: Date;
  createdByIp: string;
  revoked?: Date;
  revokedByIp?: string;
  replacedByToken?: string;
}

export class RefreshToken extends Model<RefreshTokenAttributes> implements RefreshTokenAttributes {
  declare id: number;
  declare accountId: number;
  declare token: string;
  declare expires: Date;
  declare created: Date;
  declare createdByIp: string;
  declare revoked: Date;
  declare revokedByIp: string;
  declare replacedByToken: string;

  get isExpired(): boolean {
    return new Date() >= this.expires;
  }

  get isActive(): boolean {
    return !this.revoked && !this.isExpired;
  }
}

export function initRefreshTokenModel(sequelize: Sequelize, DataTypes: any): typeof RefreshToken {
  RefreshToken.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    expires: {
      type: DataTypes.DATE,
      allowNull: false
    },
    created: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    createdByIp: {
      type: DataTypes.STRING,
      allowNull: false
    },
    revoked: {
      type: DataTypes.DATE,
      allowNull: true
    },
    revokedByIp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    replacedByToken: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'refresh_tokens',
    timestamps: false
  });

  return RefreshToken;
}