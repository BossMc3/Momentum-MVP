import { copyFileSync, existsSync, constants } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Development tooling only. Never import this module into the application.
export function setupLocalEnv(directory) {
  const target = resolve(directory, ".env");
  if (existsSync(target)) return "existing";
  const example = resolve(directory, ".env.example");
  if (!existsSync(example)) {
    throw new Error("Lipsește .env.example. Descarcă ultima versiune completă a proiectului și încearcă din nou.");
  }
  // Exclusive copy protects existing configuration, even if another process creates it.
  copyFileSync(example, target, constants.COPYFILE_EXCL);
  return "created";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (setupLocalEnv(process.cwd()) === "created") {
      console.log("Momentum: am creat .env din .env.example folosind doar setările publice. Pornim aplicația.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Setările locale nu au putut fi pregătite.");
    process.exitCode = 1;
  }
}