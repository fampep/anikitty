/**
 * Prints why the Windows native build is not produced in this pass.
 * Exit 0 when Anikitty.sln exists, otherwise exit 1 after the instructions.
 */
const fs = require("fs");
const path = require("path");

const solution = path.join(__dirname, "..", "windows", "Anikitty.sln");

console.log("Anikitty Windows target");
console.log("React Native: 0.88.1 (Expo SDK 58)");
console.log("Latest published react-native-windows: 0.85.0 (peers react-native ^0.85)");
console.log("");

if (fs.existsSync(solution)) {
  console.log("Solution found:", solution);
  console.log("Build on Windows: npx react-native run-windows");
  process.exit(0);
}

console.log("The Windows project is wired (react-native.config.js → windows/) but not generated.");
console.log("");
console.log("Left to do, on a Windows machine:");
console.log("1. Wait for a react-native-windows release that peers react-native 0.88 (0.85 does not).");
console.log("2. Install Visual Studio 2022 with the Desktop development with C++ workload and the Windows 10/11 SDK.");
console.log("3. From apps/mobile:");
console.log("     npm install react-native-windows@<version matching react-native>");
console.log("     npx @react-native-community/cli init-windows --overwrite --projectName Anikitty");
console.log("4. Open windows/Anikitty.sln or run: npx react-native run-windows");
console.log("");
console.log("This environment is Linux and has no Visual Studio toolchain, so the WinUI app cannot be compiled here.");
process.exit(1);
