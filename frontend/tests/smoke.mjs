/**
 * End-to-end smoke test against a running instance (real Firebase + Firestore).
 *
 *   BASE_URL=http://localhost:8081 ADMIN_PASSWORD=... OPERATOR_PASSWORD=... npm run test:e2e
 *
 * It registers one vehicle (TEST_PLATE), drives it through entry and exit, and checks
 * every refusal path. The records it creates are real; remove them afterwards if needed.
 */
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:8081";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123";
const operatorPassword = process.env.OPERATOR_PASSWORD ?? "Operator@123";
const plate = process.env.TEST_PLATE ?? "TS09ZZ9901";
const unknownPlate = "TS09ZZ9902";

const adminRoutes = ["/dashboard", "/vehicles", "/vehicles/search", "/movements/entry", "/movements/exit", "/monitoring", "/alerts", "/history", "/users", "/configuration", "/profile"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  // 4xx responses for deliberately refused actions are expected.
  if (message.type() === "error" && !/status of 4\d\d/.test(message.text())) errors.push(message.text());
});

const step = (name) => console.log(`• ${name}`);
const main = () => page.getByRole("main");
const toast = (text) => page.getByText(text).first().waitFor({ timeout: 15000 });

async function logout() {
  await page.goto(`${base}/profile`);
  await main().getByRole("button", { name: /Sign out/i }).click();
  await page.waitForURL("**/login");
}

async function login(username, password) {
  await page.goto(`${base}/login`);
  // exact: true — the reveal toggle is also labelled "…password"
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  await page.getByText("LIVE", { exact: true }).waitFor({ timeout: 20000 });
}

async function record(mode, regNo) {
  await page.goto(`${base}/movements/${mode}`);
  await main().getByLabel("Vehicle Registration Number").fill(regNo);
  await main().getByRole("button", { name: new RegExp(`Validate & Record ${mode}`, "i") }).click();
}

step("admin sign-in");
await login("admin", adminPassword);
for (const route of adminRoutes) {
  await page.goto(`${base}${route}`);
  await main().waitFor();
}

step("register vehicle");
await page.goto(`${base}/vehicles`);
await main().getByLabel("Registration Number").fill(plate);
await main().getByLabel("Owner Name").fill("E2E Test Owner");
await main().getByLabel("Contact").fill("9000090000");
await main().getByLabel("Vehicle Model").fill("Maruti Swift");
await main().getByLabel("Color").fill("White");
await main().getByRole("button", { name: /Register Vehicle/ }).click();
await toast("Vehicle registered successfully.");
await main().getByRole("cell", { name: plate, exact: true }).waitFor();

step("duplicate registration is refused");
await main().getByLabel("Registration Number").fill(plate);
await main().getByLabel("Owner Name").fill("Someone Else");
await main().getByLabel("Contact").fill("9000090001");
await main().getByRole("button", { name: /Register Vehicle/ }).click();
await toast(`Vehicle ${plate} is already registered.`);

step("search");
await page.goto(`${base}/vehicles/search`);
await main().getByLabel("Registration Number").fill(plate);
await main().getByText("E2E Test Owner").first().waitFor();

step("entry, duplicate entry, exit, invalid exit");
await record("entry", plate);
await main().getByText("Entry recorded successfully.").waitFor();
await record("entry", plate);
await main().getByText("Duplicate entry. Vehicle is already inside.").waitFor();
await page.goto(`${base}/monitoring`);
await main().getByRole("cell", { name: plate, exact: true }).first().waitFor();
await record("exit", plate);
await main().getByText("Exit recorded successfully.").waitFor();
await record("exit", plate);
await main().getByText("Invalid exit. Occupancy unchanged.").waitFor();

step("unregistered vehicle is refused and raises an alert");
await record("entry", unknownPlate);
await main().getByText("Unauthorized vehicle. Entry rejected.").waitFor();
await page.goto(`${base}/alerts`);
await main().getByRole("cell", { name: unknownPlate, exact: true }).first().waitFor();
await main().getByRole("button", { name: "Mark as Resolved" }).first().click();
await toast("Alert marked as resolved.");

step("history");
await page.goto(`${base}/history`);
await main().getByLabel("Vehicle").fill(plate);
await main().getByRole("cell", { name: "E2E Test Owner" }).first().waitFor();

step("deactivated vehicle is refused at the gate");
await page.goto(`${base}/vehicles`);
await main().getByRole("button", { name: `Deactivate ${plate}` }).click();
await toast(`Vehicle ${plate} is now INACTIVE.`);
await record("entry", plate);
await main().getByText("Inactive registration. Entry rejected.").waitFor();

step("operator cannot reach admin pages");
await logout();
await login("operator", operatorPassword);
await page.goto(`${base}/users`);
await page.waitForURL("**/dashboard");
await page.goto(`${base}/vehicles`);
await page.waitForURL("**/dashboard");

step("mobile menu");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/dashboard`);
await page.getByRole("button", { name: "Open menu" }).click();
await page.getByRole("link", { name: "Entry", exact: true }).waitFor();

await logout();
await browser.close();
if (errors.length) {
  throw new Error(errors.join("\n"));
}

console.log("Smoke test passed");
