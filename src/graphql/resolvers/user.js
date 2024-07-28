const { GraphQLError } = require("graphql");
const nodemailer = require("nodemailer");
const { pass } = require("../../config/index");
const bcrypt = require("bcryptjs");

module.exports = {
  User: {
    question: async (parent, args, { QuestionContext }, info) => {
      const allQuestion = parent.questions.map(async (singleQuestion) => {
        const singlequestion = await QuestionContext.findById(singleQuestion);
        if (singlequestion) {
          return singlequestion;
        }
      });
      const allQuestions = await Promise.all(allQuestion);
      return allQuestions;
    },

    answer: (parent, args, { AnswerContext }, info) => {
      const allAnswer = parent.answers.map(async (singleAnswer) => {
        const newAnswer = await AnswerContext.findById(singleAnswer);
        if (newAnswer) {
          return newAnswer;
        }
      });

      return allAnswer;
    },

    bookmarkedQuestion: (parent, args, { QuestionContext }, info) => {
      const allQuestion = parent.bookmarkedQuestions.map(
        async (singleQuestion) => {
          const singlequestion = await QuestionContext.findById(singleQuestion);
          if (singlequestion) {
            return singlequestion;
          }
        }
      );

      return allQuestion;
    },

    bookmarkedAnswer: (parent, args, { AnswerContext }, info) => {
      const allAnswer = parent.bookmarkedAnswers.map(async (singleAnswer) => {
        const newAnswer = await AnswerContext.findById(singleAnswer);
        if (newAnswer) {
          return newAnswer;
        }
      });

      return allAnswer;
    },
  },
  Result: {
    __resolveType(obj, context, info) {
      if (obj.user) {
        return "Success";
      }

      if (obj.args) {
        return "Failure";
      }

      return null;
    },
  },

  ResOtp: {
    __resolveType(obj, context, info) {
      if (obj.otp) {
        return "ResSuccess";
      }

      if (obj.args) {
        return "ResFailure";
      }

      return null;
    },
  },

  SingleResult: {
    __resolveType(obj, context, info) {
      if (obj.user) {
        return "SingleSuccess";
      }

      if (obj.args) {
        return "SingleFailure";
      }

      return null;
    },
  },

  Query: {
    getAllUser: async (parent, args, { UserContext }, info) => {
      try {
        const user = await UserContext.find({});
        return user;
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }
    },
  },
  Mutation: {
    getSingleUser: async (parent, { _id }, { UserContext }, info) => {
      try {
        const user = await UserContext.findOne({ _id });

        if (!user) {
          return {
            message: "User not found",
            args: "id",
          };
        }

        return {
          message: "User found",
          user,
        };
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }
    },
    createUser: async (
      parent,
      { createInput: { name, email, password } },
      { UserContext },
      info
    ) => {
      try {
        const user = await UserContext.findOne({ email });

        if (user) {
          return {
            message: "User already exist",
            args: "email",
          };
        }

        const newUser = await UserContext.create({
          name,
          email,
          password,
        });

        const token = await newUser.genToken();

        return {
          message: "User created Successfully",
          token: `Bearer ${token}`,
          user: {
            ...newUser._doc,
            password: "",
          },
        };
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }
    },

    loginUser: async (
      parent,
      { loginInput: { email, password } },
      { UserContext },
      info
    ) => {
      try {
        const user = await UserContext.findOne({ email });

        if (!user) {
          return {
            message: "User not found",
            args: "email"
          };
        }

        const cmpPassword = await user.comparePassword(password);

        if (!cmpPassword) {
          return {
            message: "Incorrect password",
            args: "password",
          };
        }

        const token = await user.genToken();

        return {
          token: `Bearer ${token}`,
          message: "User found",
          user: {
            ...user._doc,
            password: "",
          },
        };
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }
    },

    genOtp: async (parent, { email }, context, info) => {
      const otp = Math.floor(Math.random() * (9999 - 1000) + 1000);
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "vanshamaggarwal697@gmail.com",
          pass: process.env.pass,
        },
      });
      try {
        var mailOptions = {
          from: "vanshamaggarwal697@gmail.com",
          to: email,
          subject: "Verification from Query Overflow",
          text: `Your OTP is: ${otp}
  Regards,
  Query Overflow
                  `,
        };

        const response = transporter.sendMail(mailOptions);
        if (response) {
          return {
            message: "OTP SENT SUCCESSFULLY",
            otp: otp,
          };
        } else {
          return {
            message: "Message not sent",
            args: `${email}`,
          };
        }
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }
    },

    updateUser: async (
      parent,
      { email, password },
      { UserContext },
      info
    ) => {
      const user = await UserContext.findOne({ email });
      try {
        if (!user) {
          return {
            message: "User not found",
            args: email,
          };
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const updatedUser = await UserContext.findByIdAndUpdate(
          { _id: user._id },
          { password: hash },
          { new: true }
        );
        return {
          message: "User Updated",
          user: {
            ...updatedUser._doc,
            password: "",
          },
        };
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }
    },

    deleteUser: async (parent, { _id }, { UserContext }, info) => {
      try {
        const user = await UserContext.findById({ _id });
        if (!user) {
          return {
            message: "User not found",
            args: "id",
          };
        }

        const removedUser = await UserContext.findByIdAndRemove({ _id });
        if (removedUser) {
          return {
            message: "User deleted",
            user: removedUser,
          };
        }
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }
    },
  },
};
