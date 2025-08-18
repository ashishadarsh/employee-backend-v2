import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';

const uri = "mongodb+srv://ashuadarsh001:tiWVrEuhYDBwO6mM@employee.efvl2.mongodb.net/?retryWrites=true&w=majority&appName=employee";
const dbName = 'employee-management-dev';

// Create a single MongoClient instance (connection pooling)
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
  maxPoolSize: 20, // up to 20 concurrent operations
});

let dbInstance;

async function connectDB() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(dbName);
    console.log("✅ Connected to MongoDB");
  }
  return dbInstance;
}

// Utility: get collection quickly
async function col(name) {
  const db = await connectDB();
  return db.collection(name);
}

// ===== Functions =====

async function getEmployee(id) {
  return await (await col('employee')).findOne({ _id: new ObjectId(id) });
}

async function getEmployeesByTeam(team) {
  return await (await col('employee')).find({ team }).toArray();
}

async function getEmployeeByEmail(email) {
  return await (await col('employee')).findOne({ email });
}

async function getMessages() {
  return await (await col('messages')).find({receiverEmpId: {$exists: false}}).toArray();
}
async function getUnicastMessages(senderEmpId, receiverEmpId) {
  const senderId = new ObjectId(senderEmpId);
  const receiverId = new ObjectId(receiverEmpId);

  const messages = await (await col('messages')).find({
    $or: [
      { senderEmpId: senderId, receiverEmpId: receiverId },
      { senderEmpId: receiverId, receiverEmpId: senderId }
    ],
    receiverEmpId: { $exists: true } // ensures receiverEmpId field exists
  }).sort({ date: 1 }).toArray(); // optional: sort by date ascending
  return messages;
}


async function getEmployees() {
  return await (await col('employee')).find().toArray();
}

async function getTaskforEmployeeById(id) {
  return await (await col('tasks')).findOne({ _id: new ObjectId(id) });
}

async function getTaskforEmployee(id) {
  return await (await col('tasks')).find({ empId: id }).sort({ priority: -1, pinned: -1, completionDate: 1 }).toArray();
}

async function deleteTaskFromDb(id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const res = await (await col('tasks')).deleteOne({ _id });
  if (res.deletedCount === 0) {
    throw new Error('Task not found');
  }
  return res;
}

async function upsertTask({ _id, empId, assigneeId, completionDate, status, title, description, type, priority, pinned }) {
  const collection = await col("tasks");
  const assignedDate = new Date().toISOString().split("T")[0];

  const filter = _id ? { _id: new ObjectId(_id) } : { _id: new ObjectId() };

  const update = {
    $set: {
      empId: new ObjectId(empId),
      assigneeId: new ObjectId(assigneeId),
      completionDate,
      status,
      title,
      description,
      type,
      priority: priority ?? false,
      pinned: pinned ?? false,
      assignedDate,
    },
  };

  const options = { returnDocument: "after", upsert: true };

  return await collection.findOneAndUpdate(filter, update, options);
  r
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
  getEmployee,
  getEmployeeByEmail,
  signup,
  getEmployeesByTeam,
  getMessages,
  createMessage,
  createUnicastMessage,
  getUnicastMessages,
  deleteTaskFromDb,
  upsertTask
};
