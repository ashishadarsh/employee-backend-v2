import { getEmployees, getTaskforEmployee, getEmployee, createTask, createMessage, getEmployeesByTeam, getMessages, getTaskforEmployeeById, updateTask } from "./mongodb.js";
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
  },

  Mutation: {
    createTaskForEmployee: async (
      _root,
      { input: { _id, empId, completionDate, status, title, description, type } },
      { user }
    ) => {
      requireAuth(user);

      if (_id) {
        const taskExist = await getTaskforEmployeeById(_id);

        if (taskExist) {
          await updateTask({
            _id,
            empId,
            completionDate,
            status,
            title,
            description,
            type,
            assigneeId: user._id,
          });
          return getTaskforEmployeeById(_id);
        }
      }

      const res = await createTask({
        empId,
        completionDate,
        status,
        title,
        description,
        type,
        assigneeId: user._id,
      });

      return getTaskforEmployeeById(res.insertedId);
    },

    addMessage: async (_root, { text }, { user }) => {
      requireAuth(user);
      const message = await createMessage(user._id, user.firstName, text);
      pubSub.publish("MESSAGE_ADDED", { messageAdded: message });
      return message;
    },
  },

  Subscription: {
    messageAdded: {
      subscribe: () => pubSub.asyncIterableIterator("MESSAGE_ADDED"),
    },
  },
};
