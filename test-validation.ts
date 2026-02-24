import 'dotenv/config';
import { insertStudentSchema } from './shared/schema';

const testData = {
    studentId: "S423",
    name: "William Awedagah Aduah",
    grade: "BASIC 6A",
    email: "",
    status: "Active",
    attendance: 0
};

try {
    console.log("Testing validation for:", testData);
    const validated = insertStudentSchema.parse(testData);
    console.log("Validation SUCCESS");
} catch (error: any) {
    console.error("Validation FAILED");
    console.error(JSON.stringify(error.errors, null, 2));
}
