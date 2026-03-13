import { z } from "zod";

// Environment variable schema with validation
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5000),

  // Database
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // JWT Security (Must be at least 32 characters)
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),
  JWT_EXPIRE: z.string().default("7d"),

  // Frontend Configuration
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  OAUTH_CALLBACK_URL: z.string().url("OAUTH_CALLBACK_URL must be a valid URL"),

  // Google OAuth (Optional - for OAuth to work)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Apple Sign In (Optional)
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),

  // CORS Configuration
  ALLOWED_ORIGINS: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform(Number)
    .default(() => 900000),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform(Number)
    .default(() => 100),
  AUTH_RATE_LIMIT_MAX: z
    .string()
    .transform(Number)
    .default(() => 5),

  // File Upload
  MAX_FILE_SIZE: z
    .string()
    .transform(Number)
    .default(() => 5242880),
  UPLOAD_DIR: z.string().default("./uploads"),
});

// Validate environment variables at startup
export const validateEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    console.error("");
    parsed.error.issues.forEach((err) => {
      console.error(`  ❌ ${err.path.join(".")}: ${err.message}`);
    });
    console.error("");
    console.error(
      "Please check your .env file and ensure all required variables are set.",
    );
    process.exit(1);
  }

  // Log configuration in production mode
  if (parsed.data.NODE_ENV === "production") {
    console.log("✅ Environment variables validated successfully");
    console.log(`   - Environment: ${parsed.data.NODE_ENV}`);
    console.log(`   - Port: ${parsed.data.PORT}`);
    console.log(
      `   - MongoDB URI: ${parsed.data.MONGODB_URI.replace(
        /\/\/([^:]+):([^@]+)@/,
        "//***:***@",
      )}`,
    );
    console.log(`   - Frontend URL: ${parsed.data.FRONTEND_URL}`);
  }

  return parsed.data;
};

// Export validated environment variables
export const env = validateEnv();
