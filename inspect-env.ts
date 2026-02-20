
import fs from "fs";
const content = fs.readFileSync(".env");
console.log("Hex representation of .env:");
console.log(content.toString("hex").match(/.{1,2}/g).join(" "));
console.log("\nString representation with markers:");
console.log(content.toString().replace(/\r/g, "\\r").replace(/\n/g, "\\n\n"));
