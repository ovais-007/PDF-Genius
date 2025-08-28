/**
 * Environment variable validation utility
 * Validates required environment variables for the PDF processing application
 */

interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  recommendations: string[];
}

interface RequiredEnvVar {
  name: string;
  description: string;
  required: boolean;
  example?: string;
}

const REQUIRED_ENV_VARS: RequiredEnvVar[] = [
  {
    name: 'GOOGLE_API_KEY',
    description: 'Google Gemini AI API key for generating embeddings',
    required: true,
    example: 'AIzaSy...'
  },
  {
    name: 'PINECONE_API_KEY',
    description: 'Pinecone API key for vector database operations',
    required: true,
    example: 'pc-...'
  },
  {
    name: 'PINECONE_ENVIRONMENT',
    description: 'Pinecone environment (e.g., us-west1-gcp)',
    required: false,
    example: 'us-west1-gcp'
  },
  {
    name: 'PINECONE_INDEX_NAME',
    description: 'Name of the Pinecone index to use',
    required: false,
    example: 'pdf-embeddings'
  },
  {
    name: 'NEXTAUTH_SECRET',
    description: 'NextAuth secret for authentication',
    required: true,
    example: 'your-secret-key'
  },
  {
    name: 'NEXTAUTH_URL',
    description: 'NextAuth URL for production deployments',
    required: false,
    example: 'https://yourdomain.com'
  }
];

/**
 * Validates all required environment variables
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check each required environment variable
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value || value.trim() === '') {
      if (envVar.required) {
        missing.push(envVar.name);
      } else {
        warnings.push(`Optional environment variable ${envVar.name} is not set`);
      }
    } else {
      // Validate format for specific variables
      if (envVar.name === 'GOOGLE_API_KEY' && !value.startsWith('AIza')) {
        warnings.push('GOOGLE_API_KEY format looks incorrect (should start with "AIza")');
      }

      if (envVar.name === 'PINECONE_API_KEY' && !value.startsWith('pc-')) {
        warnings.push('PINECONE_API_KEY format looks incorrect (should start with "pc-")');
      }
    }
  }

  // Generate recommendations
  if (missing.length > 0) {
    recommendations.push('Create a .env.local file in your project root');
    recommendations.push('Add the missing environment variables to your .env.local file');
    recommendations.push('Restart your development server after adding environment variables');
  }

  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV is not set');
    recommendations.push('Set NODE_ENV to "development" or "production"');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    recommendations
  };
}

/**
 * Logs environment validation results to console
 */
export function logEnvironmentValidation(): void {
  const result = validateEnvironmentVariables();

  console.log('\n🔍 Environment Variable Validation\n');

  if (result.isValid) {
    console.log('✅ All required environment variables are present\n');
  } else {
    console.log('❌ Environment validation failed\n');

    if (result.missing.length > 0) {
      console.log('Missing required variables:');
      result.missing.forEach(name => {
        const envVar = REQUIRED_ENV_VARS.find(v => v.name === name);
        console.log(`  - ${name}: ${envVar?.description || 'No description'}`);
        if (envVar?.example) {
          console.log(`    Example: ${envVar.example}`);
        }
      });
      console.log('');
    }
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
    console.log('');
  }

  if (result.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    result.recommendations.forEach(rec => console.log(`  - ${rec}`));
    console.log('');
  }
}

/**
 * Throws an error if required environment variables are missing
 */
export function requireEnvironmentVariables(): void {
  const result = validateEnvironmentVariables();

  if (!result.isValid) {
    const missingVars = result.missing.join(', ');
    throw new Error(
      `Missing required environment variables: ${missingVars}. ` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

/**
 * Gets environment variable with validation
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      'Please add it to your .env.local file.'
    );
  }

  return value.trim();
}

/**
 * Gets environment variable with default value
 */
export function getOptionalEnvVar(name: string, defaultValue: string = ''): string {
  const value = process.env[name];
  return value?.trim() || defaultValue;
}

/**
 * Creates a sample .env.local content
 */
export function generateEnvTemplate(): string {
  const template = [
    '# Environment Variables for PDF Genius',
    '# Copy this to .env.local and fill in your actual values\n',
    ...REQUIRED_ENV_VARS.map(envVar => {
      const comment = `# ${envVar.description}`;
      const example = envVar.example ? `# Example: ${envVar.example}` : '';
      const line = `${envVar.name}=`;

      return [comment, example, line].filter(Boolean).join('\n');
    })
  ].join('\n\n');

  return template;
}

/**
 * Validates specific services availability
 */
export async function validateServices(): Promise<{
  google: boolean;
  pinecone: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let googleValid = false;
  let pineconeValid = false;

  // Validate Google API
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (apiKey) {
      // Basic validation - actual API call would need to be made to fully validate
      googleValid = apiKey.startsWith('AIza') && apiKey.length > 20;
      if (!googleValid) {
        errors.push('Google API key format appears invalid');
      }
    } else {
      errors.push('Google API key is missing');
    }
  } catch (error) {
    errors.push(`Google API validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate Pinecone API
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    if (apiKey) {
      // Basic validation - actual API call would need to be made to fully validate
      pineconeValid = apiKey.startsWith('pc-') && apiKey.length > 20;
      if (!pineconeValid) {
        errors.push('Pinecone API key format appears invalid');
      }
    } else {
      errors.push('Pinecone API key is missing');
    }
  } catch (error) {
    errors.push(`Pinecone API validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    google: googleValid,
    pinecone: pineconeValid,
    errors
  };
}
