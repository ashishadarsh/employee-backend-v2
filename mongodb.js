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
  console.log("Fetching employees for team:", team);
  
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

export async function signup(userObj) {
  const collection = await col("employee");
  const result = await collection.insertOne(userObj);
  return result; // caller may fetch created doc by insertedId
}

async function deleteTaskFromDb(id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const res = await (await col('tasks')).deleteOne({ _id });
  if (res.deletedCount === 0) {
    throw new Error('Task not found');
  }
  return res;
}

async function createTask({ empId, assigneeId, completionDate, status, title, description, type }) {
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

async function createMessage(empId, firstName, text) {
  const date = new Date().toISOString();
  const collection = await col('messages');
  const { insertedId } = await collection.insertOne({
    senderEmpId: empId,
    senderName: firstName,
    text,
    date
  });
  return await collection.findOne({ _id: insertedId });
}

async function createUnicastMessage(text, senderEmpId, receiverEmpId, firstName) {
  const date = new Date().toISOString();
  const collection = await col('messages');
  const { insertedId } = await collection.insertOne({
    senderEmpId: new ObjectId(senderEmpId),
    senderName: firstName,
    text,
    date,
    receiverEmpId: new ObjectId(receiverEmpId)
  });
  return await collection.findOne({ _id: insertedId });
}

async function signup({ email, password, firstName, lastName, dob, mobileNo, pan, gender, team, designation, address, address2, city, zip }) {
  return await (await col('employee')).insertOne({
    email,
    password,
    firstName,
    lastName,
    designation,
    mobileNo,
    dob,
    address,
    gender,
    pan,
    address2,
    city,
    zip,
    team
  });
}

export {
  getEmployees,
  getTaskforEmployee,
  getTaskforEmployeeById,
  updateTask,
  getEmployee,
  createTask,
  getEmployeeByEmail,
  signup,
  getEmployeesByTeam,
  getMessages,
  createMessage,
  createUnicastMessage,
  getUnicastMessages,
  deleteTaskFromDb
};
