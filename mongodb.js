
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';

// const uri = "mongodb+srv://ashuadarsh001:NG1vDXjagDTCAE5K@cluster0.5e8yt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const uri = "mongodb+srv://ashuadarsh001:tiWVrEuhYDBwO6mM@employee.efvl2.mongodb.net/?retryWrites=true&w=majority&appName=employee";
//const uri = 'mongodb+srv://ashuadarsh001:e4XtT1aqDxkOyISD@employee-management.epkpq.mongodb.net/?retryWrites=true&w=majority&appName=employee-management';
const dbName = 'employee-management-dev';

async function getEmployee(id) {
  const client = new MongoClient(uri);
  const uid = new ObjectId(id);
  try {
    await client.connect();
    console.log("connected to db");
    const db = client.db(dbName);
    const collection = db.collection('employee');
    const employee = await collection.findOne({_id: uid});
    return employee;
  } finally {
    await client.close();
  }
}

async function getEmployeesByTeam(team) {
  const client = new MongoClient(uri);
  // const uid = new ObjectId(id);
  try {
    await client.connect();
    console.log("connected to db");
    const db = client.db(dbName);
    const collection = db.collection('employee');
    const employees = await collection.find({team: team}).toArray();
    return employees;
  } finally {
    await client.close();
  }
}

async function getEmployeeByEmail(email) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('employee');
    const employee = await collection.findOne({email: email});
    return employee;
  } finally {
    await client.close();
  }
}

async function getMessages() {
  const client = new MongoClient(uri);
  console.log({client});
  
  try {
    console.log("inside try block");
    
    await client.connect();
    console.log("connected to db");
    const db = client.db(dbName);
    const collection = db.collection('messages');
    const messages = await collection.find().toArray();
    console.log({messages});
    
    return messages;
  } finally {
    await client.close();
  }
}

async function getEmployees() {
  const client = new MongoClient(uri);
  console.log({client});
  
  try {
    console.log("inside try block");
    
    await client.connect();
    console.log("connected to db");
    const db = client.db(dbName);
    const collection = db.collection('employee');
    const employees = await collection.find().toArray();
    return employees;
  } finally {
    await client.close();
  }
}

async function getTaskforEmployee(id) {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("connected to db");
    const db = client.db(dbName);
    const collection = db.collection('tasks');
    const tasks = await collection.find({empId: id}).toArray();
    return tasks;
  } finally {
    await client.close();
  }
}

async function createTask({empId, assigneeId, completionDate, status, title, description}) {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("connected to db");
    const db = client.db(dbName);
    const collection = db.collection('tasks');
    const taskempId = new ObjectId(empId);
    const taskassigneeId = new ObjectId(assigneeId);
    const assignedDate = '2024-12-12'
    const tasks = await collection.insertOne({empId: taskempId, assigneeId: taskassigneeId, completionDate, status, title, description, assignedDate});
    return tasks;
  } finally {
    await client.close();
  }
}

async function createMessage(empId, firstName, text) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('messages');
    console.log(empId, text); 
    const date = new Date().toISOString();
    const message = await collection.insertOne({senderEmpId: empId, senderName: firstName, text: text, date: date});
    const addedMsg = await collection.findOne({_id: message.insertedId})
    return addedMsg;
  } finally {
    await client.close();
  }
}

async function signup({email, password, firstName, lastName,  dob, mobileNo, pan, gender, team, designation, address, address2, city, zip}) {
  console.log("email from db", email);
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('employee');
    const employee = await collection.insertOne({email: email, password: password, firstName: firstName, lastName: lastName, designation: designation, mobileNo: mobileNo, dob: dob, address: address, gender: gender, pan: pan, address2: address2, city: city, zip: zip, team: team});
    console.log({employee});
    
    return employee;
  } finally {
    await client.close();
  }
}

export { getEmployees, getTaskforEmployee, getEmployee , createTask, getEmployeeByEmail, signup, getEmployeesByTeam, getMessages, createMessage};
