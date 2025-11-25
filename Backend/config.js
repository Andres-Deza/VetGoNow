// Load environment variables from the .env file
import dotenv from 'dotenv';
dotenv.config();  // Make sure this line is at the top of the file

// Validar configuración crítica al iniciar
const validateEnvironment = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Variables requeridas solo en producción o si se está usando Webpay
  const webpayVars = ['BASE_URL', 'FRONTEND_URL', 'WEBPAY_COMMERCE_CODE', 'WEBPAY_API_KEY'];
  const missingVars = webpayVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    if (isDevelopment) {
      console.warn('WARNING: Some Webpay environment variables are missing:', missingVars.join(', '));
      console.warn('Webpay features will not be available. For local development, you can:');
      console.warn('   1. Set these variables in your .env file');
      console.warn('   2. Use ngrok for HTTPS URLs (required for Webpay)');
      console.warn('   3. Continue without Webpay features');
    } else {
      console.error('ERROR: Missing required environment variables for production:', missingVars.join(', '));
      process.exit(1);
    }
  }

  // Validar URLs de Webpay solo si están configuradas
  if (process.env.BASE_URL && process.env.FRONTEND_URL) {
    try {
      const baseUrl = new URL(process.env.BASE_URL);
      const frontendUrl = new URL(process.env.FRONTEND_URL);

      if (baseUrl.protocol !== 'https:' || frontendUrl.protocol !== 'https:') {
        console.warn('WARNING: Webpay requires HTTPS URLs');
        console.warn('For local development, use ngrok: https://ngrok.com');
        console.warn('Commands:');
        console.warn('   - Backend: ngrok http 5555');
        console.warn('   - Frontend: ngrok http 5173');
        console.warn('   - Then update .env with the HTTPS URLs provided by ngrok');
      } else {
        console.log('Webpay URLs are HTTPS - OK');
      }
    } catch (error) {
      console.error('Invalid URL format in environment variables:', error.message);
      if (!isDevelopment) {
        process.exit(1);
      }
    }
  }

  console.log('Environment validation passed');
};

// Ejecutar validación
validateEnvironment();

// Email configuration
// Por defecto usa Mailtrap para desarrollo (gratis hasta 500 emails/mes)
// Registrate en https://mailtrap.io y crea un inbox para obtener las credenciales
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: process.env.SMTP_PORT || 2525,
  secure: process.env.SMTP_SECURE === 'true' || false,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
};

// Frontend URL for password reset links
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Email sender address
export const EMAIL_FROM = process.env.EMAIL_FROM || 'VetGoNow <noreply@vetgonow.com>';

// Export configuration variables
export const PORT = process.env.PORT || 5555;
export const mongoDBURL = process.env.mongoDBURL || 'mongodb://127.0.0.1:27017/VetGoNow';
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Mercado Pago configuration
export const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
export const MERCADOPAGO_PUBLIC_KEY = process.env.MERCADOPAGO_PUBLIC_KEY || '';


