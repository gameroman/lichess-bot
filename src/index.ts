import { Computer } from "./computer";

async function main() {
  const computer = new Computer();
  await computer.run();
}

await main();
