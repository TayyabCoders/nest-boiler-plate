export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mode: process.env.APP_MODE || 'HTTP', 
});