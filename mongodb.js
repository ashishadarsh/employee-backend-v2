// mongodb.js
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = process.env.DB_NAME || "employee-management-dev";

if (!MONGODB_URI) {
  console.warn("Warning: MONGODB_URI is not set. Set it in environment variables.");
}

const client = new MongoClient(MONGODB_URI, {
  serverApi: ServerApiVersion.v1,
  maxPoolSize: 20,
  // useUnifiedTopology is default in new driver versions
});

let dbInstance = null;

export async function connectDB() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB database: ${DB_NAME}`);
  }
  return dbInstance;
}

async function col(name) {
  const db = await connectDB();
  return db.collection(name);
}

export async function getEmployee(id) {
  if (!ObjectId.isValid(id)) return null;
  return await (await col("employee")).findOne({ _id: new ObjectId(id) });
}

export async function getEmployeeByEmail(email) {
  return await (await col("employee")).findOne({ email });
}

export async function getEmployees() {
  return await (await col("employee")).find().toArray();
}

export async function getEmployeesByTeam(team) {
  return await (await col("employee")).find({ team }).toArray();
}

export async function getMessages() {
  return await (await col("messages")).find({ receiverEmpId: { $exists: false } }).toArray();
}

export async function getUnicastMessages(senderEmpId, receiverEmpId) {
  const senderId = new ObjectId(senderEmpId);
  const receiverId = new ObjectId(receiverEmpId);

  const messages = await (await col("messages"))
    .find({
      $or: [
        { senderEmpId: senderId, receiverEmpId: receiverId },
        { senderEmpId: receiverId, receiverEmpId: senderId },
      ],
      receiverEmpId: { $exists: true },
    })
    .sort({ date: 1 })
    .toArray();
  return messages;
}

export async function createMessage(empId, firstName, text) {
  const date = new Date().toISOString();
  const collection = await col("messages");
  const { insertedId } = await collection.insertOne({
    senderEmpId: new ObjectId(empId),
    senderName: firstName,
    text,
    date,
  });
  return await collection.findOne({ _id: insertedId });
}

export async function createUnicastMessage(text, senderEmpId, receiverEmpId, firstName) {
  const date = new Date().toISOString();
  const collection = await col("messages");
  const { insertedId } = await collection.insertOne({
    senderEmpId: new ObjectId(senderEmpId),
    senderName: firstName,
    text,
    date,
    receiverEmpId: new ObjectId(receiverEmpId),
  });
  return await collection.findOne({ _id: insertedId });
}

export async function signup(userObj) {
  const collection = await col("employee");
  const result = await collection.insertOne(userObj);
  return result; // caller may fetch created doc by insertedId
}

// Task helpers (kept as in your original)
export async function getTaskforEmployeeById(id) {
  return await (await col("tasks")).findOne({ _id: new ObjectId(id) });
}

export async function getTaskforEmployee(id) {
  console.log("Fetching tasks for employee with ID:", id);
  
  return await (await col("tasks")).find({ empId: id }).toArray();
}

export async function createTask({ empId, assigneeId, completionDate, status, title, description, type }) {
  const assignedDate = new Date().toISOString().split("T")[0];
  return await (await col("tasks")).insertOne({
    empId: new ObjectId(empId),
    assigneeId: new ObjectId(assigneeId),
    completionDate,
    status,
    title,
    description,
    assignedDate,
    type,
  });
}

export async function updateTask({ _id, empId, assigneeId, completionDate, status, title, description, type }) {
  return await (await col("tasks")).updateOne(
    { _id: new ObjectId(_id) },
    {
      $set: {
        empId: new ObjectId(empId),
        assigneeId: new ObjectId(assigneeId),
        completionDate,
        status,
        title,
        description,
        type,
      },
    }
  );
}
