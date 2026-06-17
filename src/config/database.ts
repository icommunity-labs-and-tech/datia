export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  sslMode?: 'require' | 'prefer' | 'allow' | 'disable';
}

export const getDatabaseConfig = (): DatabaseConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'certypass',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: isProduction,
    sslMode: isProduction ? 'require' : 'disable',
  };
};

export const buildDatabaseUrl = (): string => {
  const config = getDatabaseConfig();
  
  let url = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
  
  if (config.ssl) {
    url += `?sslmode=${config.sslMode}`;
  }
  
  return url;
};

export const validateDatabaseConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const config = getDatabaseConfig();
  
  if (!config.host) errors.push('DB_HOST is required');
  if (!config.database) errors.push('DB_NAME is required');
  if (!config.username) errors.push('DB_USER is required');
  if (!config.password) errors.push('DB_PASSWORD is required');
  
  return {
    valid: errors.length === 0,
    errors
  };
};
