import { faker } from "@faker-js/faker";

/**
 * Generates a unique employee record per test run so repeated executions
 * never collide with data left behind by a previous run on the shared
 * public OrangeHRM demo instance.
 */
export function generateEmployee() {
  const runTag = Date.now().toString().slice(-6);
  const firstName = faker.person.firstName();
  const lastName = `QA${runTag}`;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    username: `${firstName.toLowerCase()}.${runTag}`,
    password: `Qa!${runTag}Automate`,
    updatedJobTitle: "QA Automation Engineer",
    updatedMobile: faker.phone.number({ style: "national" }).replace(/\D/g, "").slice(0, 10),
  };
}

export type GeneratedEmployee = ReturnType<typeof generateEmployee>;
