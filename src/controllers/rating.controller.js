const Rating = require('../models/rating.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');

const postRate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rated_user, job_id, value, feedback } = req.body;
    const existingRate = await Rating.findOne({ user: userId, rated_user });
    if (existingRate) {
      return res.status(404).json({ message: 'you have rated this user before' });
    }
    const Completed = await Project.findOne({ project_status: 'Complete', job: job_id });
    if (!Completed) {
      return res.status(404).json({ message: 'you cannot rate this user because the project is not completed' });
    }
    const freelancerId = await User.findOne({
      $or: [
        { _id: userId, role: { $eq: 'freelancer' } },
        { _id: rated_user, role: { $eq: 'freelancer' } },
      ],
    });
    const clientId = await User.findOne({
      $or: [
        { _id: userId, role: { $eq: 'client' } },
        { _id: rated_user, role: { $eq: 'client' } },
      ],
    });
    const rating = await Rating.create({
      freelancer_Id: freelancerId,
      client_Id: clientId,
      job_id,
      value,
      feedback,
    });

    await rating.save();
    Completed.rating.push(rating._id);
    await Completed.save();
    return res.status(201).json({ rating });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getRatings = async (req, res) => {
  const { userId } = req.params;
  try {
    const ratings = await Rating.find({
      $or: [{ freelancer_Id: userId }, { client_Id: userId }],
    }).populate({
      path: 'freelancer_Id client_Id',
      select: 'first_name last_name',
      model: User,
    });
    // console.log(ratings);
    if (ratings.length > 0) {
      return res.status(200).json(ratings);
    }
    return res.status(404).json({ message: 'no rating found' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllRatingsForAdmin = async (req, res) => {
  try {
    const ratings = await Rating.find();
    if (ratings) {
      return res.status(200).json(ratings);
    }
    return res.status(404).json({ message: 'no ratings found' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  postRate,
  getRatings,
  getAllRatingsForAdmin,
};
