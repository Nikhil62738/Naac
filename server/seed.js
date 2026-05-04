import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { connectDb } from "./db.js";
import User from "./models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env"), override: true });

await connectDb();

const users = [
  {
    name: "Dr. HOD",
    email: "hod@naac.local",
    password: "hod12345",
    role: "hod",
    department: "Computer Engineering",
    approvalStatus: "Approved",
    isActive: true
  },
  {
    name: "IQAC Admin",
    email: "iqac@naac.local",
    password: "iqac12345",
    role: "iqac",
    department: "Computer Engineering",
    approvalStatus: "Approved",
    isActive: true
  },
  {
    name: "Prof. Teacher",
    email: "teacher@naac.local",
    password: "teacher12345",
    role: "teacher",
    department: "Computer Engineering",
    subjects: ["Database Management Systems", "Web Technology"],
    approvalStatus: "Approved",
    isActive: true
  }
];

for (const user of users) {
  const passwordHash = await bcrypt.hash(user.password, 10);
  await User.findOneAndUpdate(
    { email: user.email },
    { ...user, passwordHash },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

console.log("Seeded demo accounts:");
console.log("HOD: hod@naac.local / hod12345");
console.log("Teacher: teacher@naac.local / teacher12345");
console.log("IQAC: iqac@naac.local / iqac12345");
process.exit(0);
