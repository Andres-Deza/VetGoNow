// Load environment variables from the .env file
import dotenv from 'dotenv';
dotenv.config();  // Make sure this line is at the top of the file

// 🔍 Validar configuración crítica al iniciar
const validateEnvironment = () => {
  const requiredVars = ['BASE_URL', 'FRONTEND_URL', 'WEBPAY_COMMERCE_CODE', 'WEBPAY_API_KEY'];

  console.log('🔧 Validating environment configuration...');

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  }

  // Validar URLs de Webpay
  try {
    const baseUrl = new URL(process.env.BASE_URL);
    const frontendUrl = new URL(process.env.FRONTEND_URL);

    if (baseUrl.protocol !== 'https:' || frontendUrl.protocol !== 'https:') {
      console.warn('⚠️ WARNING: Webpay requires HTTPS URLs');
      console.warn('💡 For local development, use ngrok: https://ngrok.com');
      console.warn('💡 Commands:');
      console.warn('   - Backend: ngrok http 5555');
      console.warn('   - Frontend: ngrok http 5173');
      console.warn('   - Then update .env with the HTTPS URLs provided by ngrok');
    } else {
      console.log('✅ Webpay URLs are HTTPS - OK');
    }
  } catch (error) {
    console.error('❌ Invalid URL format in environment variables:', error.message);
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
};

// Ejecutar validación
validateEnvironment();

// Export configuration variables
export const PORT = process.env.PORT || 5555;
export const mongoDBURL = process.env.mongoDBURL || 'mongodb://127.0.0.1:27017/VetGestion';
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';


