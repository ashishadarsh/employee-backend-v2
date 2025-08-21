import { getEmployees, getTaskforEmployee, getEmployee, createMessage, createUnicastMessage, getEmployeesByTeam, getMessages, getTaskforEmployeeById, getUnicastMessages, deleteTaskFromDb, upsertTask } from "./mongodb.js";
import { PubSub } from "graphql-subscriptions";
import { GraphQLError } from "graphql";

const pubSub = new PubSub();

// --- Utility Functions ---
const requireAuth = (user) => {
  if (!user) throw unauthorizedError();
};

const handleQuery = async (fn, errorMsg) => {
  try {
    const result = await fn();
    if (!result) throw new GraphQLError(errorMsg);
    return result;
  } catch (error) {
    console.error(errorMsg, error);
    throw error;
  }
};

function unauthorizedError() {
  return new GraphQLError("Not authenticated", {
    extensions: { code: "UNAUTHORIZED" },
  });
}

// --- Resolvers ---
export const resolvers = {
  Query: {
    employee: (_root, { id }, { user }) =>
      handleQuery(
        async () => {
          requireAuth(user);
          return getEmployee(id);
        },
        "No employee found"
      ),

    getEmployeesByTeam: (_root, _args, { user }) =>
      handleQuery(
        async () => {
          requireAuth(user);
          return getEmployeesByTeam(user.team);
        },
        "No employee found"
      ),

    employees: () =>
      handleQuery(getEmployees, "No employees found"),

    tasksForEmployee: (_root, _args, { user }) =>
      handleQuery(
        async () => {
          requireAuth(user);
          return getTaskforEmployee(user._id);
        },
        "No tasks for employee found"
      ),
    messages: (_root, _args, { user }) => {
      requireAuth(user);
      return getMessages();
    },
    UnicastMessages: async (_root, { senderEmpId, receiverEmpId }, { user }) => {
      requireAuth(user);
      const data = await getUnicastMessages(senderEmpId, receiverEmpId);
      return data;
    },
  },

  Mutation: {
    createTaskForEmployee: async (
      _root,
      { input: { _id, empId, completionDate, status, title, description, type, priority, pinned, backlog } },
      { user }
    ) => {
      requireAuth(user);
    const res = await upsertTask({
        _id,
        empId,
        assigneeId: user._id,
        completionDate,
        status,
        title,
        description,
        type,
        priority,
        pinned,
        backlog
        });
        return getTaskforEmployeeById(res._id);
    },

    deleteTask: async (_root, { id }, { user }) => {
        requireAuth(user);
        const task = await getTaskforEmployeeById(id);
        if (!task) {
            throw new GraphQLError("Task not found", {
                extensions: { code: "NOT_FOUND" },
            });
        }
        const result = await deleteTaskFromDb(id);
        if (result.deletedCount === 0) {
            throw new GraphQLError("Failed to delete task", {
                extensions: { code: "INTERNAL_SERVER_ERROR" },
            });
        }
        return { success: true, message: "Task deleted successfully" };
        },

    addMessage: async (_root, { text }, { user }) => {
      requireAuth(user);
      const message = await createMessage(user._id, user.firstName, text);
      pubSub.publish("MESSAGE_ADDED", { messageAdded: message });
      return message;
    },

    addUnicastMessage: async (_root, { input: { text, senderEmpId, receiverEmpId } }, { user }) => {
      requireAuth(user);
      const employee = await getEmployee(senderEmpId);
    //   if (!employee) {
    //     throw new GraphQLError("Employee not found", {
    //       extensions: { code: "NOT_FOUND" },
    //     });
    //   }
      const unicastMessage = await createUnicastMessage(text, senderEmpId, receiverEmpId, employee.firstName);
      pubSub.publish("UNICAST_MESSAGE_ADDED", { unicastMessageAdded: unicastMessage });
      return unicastMessage;
    },
  },

  Subscription: {
    messageAdded: {
      subscribe: () => pubSub.asyncIterableIterator("MESSAGE_ADDED"),
    },
    unicastMessageAdded: {
      subscribe: () => pubSub.asyncIterableIterator("UNICAST_MESSAGE_ADDED"),
    },
  },
};
