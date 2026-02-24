const { storage } = require("./server/storage");
async function main() {
    const students = await storage.getStudents();
    console.log(students);
}
main().catch(console.error);
