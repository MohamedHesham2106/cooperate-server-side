const Chat = require('../models/chat.model');
const Conversation = require('../models/conversation.model');
const Socket = require('../models/socket.model');
const Notification = require('../models/notification.model');
const logger = require('../config/logger');

function socketChatMiddleware(io) {
  io.on('connection', (socket) => {
    socket.on('joinRoom', ({ conversationId }) => {
      const roomName = `conversation-${conversationId}`;
      console.log(`Joining room ${roomName}`);
      socket.join(roomName);
    });
    socket.on('sendMessage', async ({ conversationId, message, senderId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          console.log(`Conversation with ID ${conversationId} not found`);
          return;
        }

        const chat = await Chat.create({
          conversation_id: conversationId,
          sender_id: senderId,
          message,
        });
        await chat.save();

        conversation.chat.push(chat._id);
        await conversation.save();

        const roomName = `conversation-${conversationId}`;
        io.to(roomName).emit('newMessage', chat);
      } catch (error) {
        console.log(`Error sending message: ${error}`);
      }
    });
  });
}
function socketPersistUserMiddleware(io) {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('userId', async ({ userId, socketId }) => {
      try {
        await Socket.findOneAndUpdate({ userId }, { $set: { socketId } }, { upsert: true });
        logger.info(`User connected with userId: ${userId}`);
      } catch (error) {
        // Handle duplicate key error if the record already exists
        if (error.code === 11000) {
          logger.warn(`User with userId: ${userId} already exists`);
        } else {
          logger.error(`Error saving user with userId: ${userId}`, error);
        }
      }

      // Store the userId in the socket object for future reference
      socket.userId = userId;
    });

    socket.on('disconnect', async () => {
      await Socket.findOneAndDelete({ socketId: socket.id });
      logger.info(`Socket disconnected: ${socket.id}`);
      socket.disconnect();
    });
  });
}
function socketNotificationMiddleware(io) {
  io.on('connection', (socket) => {
    socket.on('new-notification', async ({ user, target, feedback }) => {
      try {
        const notification = await Notification.create({
          user,
          target,
          feedback,
        });
        await notification.save();
        const populatedNotification = await Notification.findById(notification._id).populate({
          path: 'user',
          select: 'imageUrl first_name last_name',
        });
        const socketDoc = await Socket.findOne({ userId: target });
        // console.log(socketDoc);
        // console.log(notification);
        if (socketDoc) {
          const socketId = socketDoc.socketId; // Extract the socketId from the document
          // console.log(`Sending Notification to ${socketId}`);
          io.to(socketId).emit('receive-notification', populatedNotification);
        }
      } catch (error) {
        console.log(`Error sending message: ${error}`);
      }
    });
  });
}
module.exports = { socketChatMiddleware, socketPersistUserMiddleware, socketNotificationMiddleware };
