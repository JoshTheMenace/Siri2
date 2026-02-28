import { executeShell } from "./shell-executor.js";

const DEVICE_PIN = process.env.DEVICE_PIN || "";

export async function isScreenOn(): Promise<boolean> {
  const r = await executeShell("dumpsys display | grep mScreenState", { timeout: 5000 });
  return r.stdout.includes("ON");
}

export async function wakeAndUnlock(): Promise<boolean> {
  if (!DEVICE_PIN) {
    console.log("\x1b[31m[device-wake] No DEVICE_PIN set in .env\x1b[0m");
    return false;
  }

  // Wake screen
  await executeShell("input keyevent KEYCODE_WAKEUP");
  await sleep(500);

  // Swipe up to show PIN entry
  await executeShell("input swipe 360 1200 360 400 300");
  await sleep(500);

  // Enter PIN
  await executeShell(`input text ${DEVICE_PIN}`);
  await executeShell("input keyevent KEYCODE_ENTER");
  await sleep(500);

  // Verify screen is on
  const on = await isScreenOn();
  if (!on) {
    console.log("\x1b[31m[device-wake] Failed to wake/unlock device\x1b[0m");
    return false;
  }

  console.log("\x1b[32m[device-wake] Device woken and unlocked\x1b[0m");
  return true;
}

export async function sleepDevice(): Promise<void> {
  await executeShell("input keyevent 223");
  console.log("\x1b[90m[device-wake] Device put to sleep\x1b[0m");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
