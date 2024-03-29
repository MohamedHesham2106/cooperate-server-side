const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    client_id: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    Freelancer_id: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    chat: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Chat',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
