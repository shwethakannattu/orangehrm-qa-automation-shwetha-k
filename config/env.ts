import * as dotenv from "dotenv";
dotenv.config();

export interface EnvConfig {
  baseUrl: string;
  adminUsername: string;
  adminPassword: string;
}

const environments: Record<string, EnvConfig> = {
  dev: {
    baseUrl: process.env.BASE_URL || "https://opensource-demo.orangehrmlive.com",
    adminUsername: process.env.ADMIN_USERNAME || "Admin",
    adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  },
  staging: {
    // Placeholder — point this at a staging OrangeHRM instance when one exists.
    // Kept separate from "dev" to demonstrate environment-based configuration
    // (Part 2 / Part 6 requirement) even though this assignment only has one
    // real target environment (the public OrangeHRM demo).
    baseUrl: process.env.BASE_URL || "https://opensource-demo.orangehrmlive.com",
    adminUsername: process.env.ADMIN_USERNAME || "Admin",
    adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  },
};

const selectedEnv = process.env.TEST_ENV || "dev";

if (!environments[selectedEnv]) {
  throw new Error(
    `Unknown TEST_ENV "${selectedEnv}". Valid options: ${Object.keys(environments).join(", ")}`
  );
}

export const config: EnvConfig = environments[selectedEnv];
