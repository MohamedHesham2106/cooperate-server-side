const express = require('express');
const { authenticate } = require('../../middlewares/authentication');
const { authorization } = require('../../middlewares/authorization');
const chatController = require('../../controllers/chat.controller');

const chatRoutes = express.Router();

chatRoutes.post('/:conversationId', chatController.sendMessage);

chatRoutes.get('/:conversationId', chatController.getAllMessages);

module.exports = chatRoutes;
