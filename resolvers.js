import { ObjectId } from "mongodb";
import { getEmployees, getTaskforEmployee, getEmployee, createTask, createMessage, getEmployeesByTeam, getMessages } from "./mongodb.js"
import { subscribe } from "graphql";
import { PubSub } from "graphql-subscriptions";

const pubSub = new PubSub();

export const resolvers = {
    Query: {
        employee: async (_root, {id}, {user}) => {
            if(!user) {
                throw Error('Auth error');
            }
            try {
                const employee = await getEmployee(user._id);
                if (!employee) {
                    throw new GraphQLError('No employee found')
                }
                return employee;
              } catch (error) {
                console.error('Error fetching employee:', error);
                throw error;
              }
        },

        getEmployeesByTeam: async (_root, {id}, {user}) => {
            if(!user) {
                throw Error('Auth error');
            }
            try {
                const employees = await getEmployeesByTeam(user.team);
                if (!employees) {
                    throw new GraphQLError('No employee found')
                }
                return employees;
            } catch(err) {
                console.error('Error fetching employees of this team:', error);
                throw error;
            }
        },

        employees: async() => {
            try {
                const employee = await getEmployees();
                if (!employee) {
                    throw new GraphQLError('No employees found')
                }
                return employee;
              } catch (error) {
                console.error('Error fetching employees:', error);
                throw error;
              }
            
        },

        tasksForEmployee: async(_root, {id}, {user}) => {
            if(!user) {
                throw Error('Auth Error');
            }
            try {
                const tasks = await getTaskforEmployee(user._id);
                if (!tasks) {
                    throw new GraphQLError('No tasks for employee found')
                }
                return tasks;
            } catch(error) {
                console.error('Error fetching tasks for employee:', error);
                throw error;
            }
        },

        messages: (_root, _args, { user }) => {
            if (!user) throw unauthorizedError();
            return getMessages();
        },
    },

    Mutation: {
        createTaskForEmployee: (_root,{input :{empId, assigneeId, completionDate, status, title, description}}, {user}) => {
            if(!user) {
                throw Error('not found');
            }
            // return null;
            return createTask({empId, assigneeId, completionDate, status, title, description})
        },

        addMessage: async (_root, { text }, { user }) => {
            if (!user) throw unauthorizedError();
            const message = await createMessage(user._id, user.firstName, text);
            pubSub.publish('MESSAGE_ADDED', { messageAdded: message });
            console.log("msg",message);
            
            return message;
        }
        
        

        // signupEmployee: (_root, {input: {email, password, firstName, lastName}}) => {
        //     return signup({email, password, firstName, lastName})
        // }
    },

    Subscription: {
        messageAdded: {
            subscribe: () => pubSub.asyncIterableIterator('MESSAGE_ADDED'),
        },
    },

    //Field Resolvers

    // Employee: {
    //     dob: (employee) => {
    //         return '2024-12-06';
    //     }
    // }
};

function unauthorizedError() {
    return new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }