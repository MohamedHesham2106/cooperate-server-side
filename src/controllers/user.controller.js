const User = require('../models/user.model');
const Joi = require('joi');
const { changePasswordSchema } = require('../utils/Validation');
const sendEmail = require('../services/sendEmail');
const Category = require('../models/category.model');
const Skill = require('../models/skill.model');
const Job = require('../models/job.model');
const { cloudinary } = require('../middlewares/cloudinary');
const fs = require('fs');
const Project = require('../models/project.model');

const changePassword = async (req, res, next) => {
  const body = { body: req.body };
  // Validation using Joi to make sure passwords are provided and are not the same
  const { value, error } = Joi.compile(changePasswordSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(body);
  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return res.status(400).json({ message: errorMessage });
  }
  // Destructure oldPassword and newPassword from request body
  const { oldPassword, newPassword, userId } = req.body;
  try {
    // Find user by ID
    const user = await User.findById(userId).exec();
    // If the user is not found, return a 404 status code and error message
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    // If the old password provided does not match the current password, return a 422 status code
    if (!(await user.isPasswordMatch(oldPassword))) {
      return res.status(422).json({ message: 'Incorrect old password.' });
    }
    // Update the user's password and save changes to the database
    user.password = newPassword;
    await user.save();
    // Return a 200 status code and success message
    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    // If there is an error during the process, return a 500 status code and error message
    return res.status(500).json({ message: err.message });
  }
};

const getUsers = async (req, res, next) => {
  try {
    // Query the database for all users and exclude the password field from the results
    const users = await User.find({})
      .select('-password')
      .populate({
        path: 'categories',
        select: 'name',
        model: Category,
      })
      .populate({
        path: 'skills',
        select: 'name',
        model: Skill,
      })
      .populate({
        path: 'jobs',
        populate: {
          path: 'category',
          select: 'name',
          model: Category,
        },
      })
      .populate({
        path: 'jobs',
        populate: {
          path: 'skills',
          select: 'name',
          model: Skill,
        },
      }); // If the operation is successful, send the array of users back in the response body as JSON
    return res.status(200).json({ users });
  } catch (error) {
    // If there is an error, send a 500 status code with the error message in the response body as JSON
    return res.status(500).json({ message: error.message });
  }
};

const getUser = async (req, res, next) => {
  // Destructure userId from request body
  const { userId } = req.params;
  try {
    // Find user by ID and exclude password field
    const user = await User.findById(userId)
      .select('-password')
      .populate({
        path: 'categories',
        select: 'name',
        model: Category,
      })
      .populate({
        path: 'skills',
        select: 'name',
        model: Skill,
      })
      .populate({
        path: 'jobs',
        populate: {
          path: 'category',
          select: 'name',
          model: Category,
        },
      })
      .populate({
        path: 'jobs',
        populate: {
          path: 'skills',
          select: 'name',
          model: Skill,
        },
      })
      .exec();

    // If the user is not found, return a 404 status code and error message
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    } // Return user data
    return res.status(200).json({ user });
  } catch (err) {
    // If there is an error during the process, return a 500 status code and error message
    return res.status(500).json({ message: err.message });
  }
};

// Check for Empty Values
const isDefinedAndNotEmpty = (value) => {
  return value !== '' && !!value;
};
const updateUser = async (req, res) => {
  const {
    new_first_name,
    new_last_name,
    new_email,
    new_address,
    new_phone,
    new_CvUrl,
    new_education,
    new_biography,
    new_company_name,
    new_country,
    language,
    new_gender,
    new_birthDate,
  } = req.body;
  console.log(req.body);
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).exec();

    if (isDefinedAndNotEmpty(new_first_name) && user.first_name !== new_first_name) {
      user.first_name = new_first_name;
    }
    if (isDefinedAndNotEmpty(new_last_name) && user.last_name !== new_last_name) {
      user.last_name = new_last_name;
    }
    if (isDefinedAndNotEmpty(new_email) && user.email !== new_email) {
      user.new_email = new_email;
      // let message = `<a href=".">Please Click Here To Update Your Email</a>`;
      // sendEmail(new_email, message);
    }
    if (isDefinedAndNotEmpty(new_address) && user.address !== new_address) {
      user.address = new_address;
    }
    if (isDefinedAndNotEmpty(new_phone) && user.phone !== new_phone) {
      user.phone = new_phone;
    }
    if (isDefinedAndNotEmpty(new_country) && user.country !== new_country) {
      user.country = new_country;
    }
    if (isDefinedAndNotEmpty(new_education) && user.education !== new_education) {
      user.education = new_education;
    }

    // Handle language field
    if (language && language.length > 0) {
      for (const lang of language) {
        if (!lang.level) {
          // Delete language if level is not provided
          user.language = user.language.filter((l) => l.language !== lang.language);
        } else {
          const existingLang = user.language.find((l) => l.language === lang.language);
          if (existingLang) {
            existingLang.level = lang.level;
          } else {
            user.language.push({ language: lang.language, level: lang.level });
          }
        }
      }
    }
    if (isDefinedAndNotEmpty(new_CvUrl) && user.role === 'freelancer' && user.Cv !== new_CvUrl) {
      user.CvUrl = new_CvUrl;
    }
    if (isDefinedAndNotEmpty(new_biography) && user.role === 'freelancer' && user.biography !== new_biography) {
      user.biography = new_biography;
    }
    if (isDefinedAndNotEmpty(new_company_name) && user.role === 'client' && user.company_name !== new_company_name) {
      user.company_name = new_company_name;
    }
    if (isDefinedAndNotEmpty(new_gender) && user.gender !== new_gender) {
      user.gender = new_gender;
    }
    if (isDefinedAndNotEmpty(new_birthDate) && user.birthDate !== new_birthDate) {
      const dateParts = new_birthDate.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);

      const formattedBirthDate = new Date();
      formattedBirthDate.setUTCFullYear(year);
      formattedBirthDate.setUTCMonth(month);
      formattedBirthDate.setUTCDate(day);
      formattedBirthDate.setUTCHours(0, 0, 0, 0);

      user.birthDate = formattedBirthDate;
    }

    await user.save();
    return res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
const updateSkills = async (req, res) => {
  const { userId } = req.params;
  const { skills } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the skills in the database or create them if they don't exist
    const skillObjects = await Promise.all(
      skills.map(async (skillName) => {
        let skill = await Skill.findOne({ name: skillName });
        if (!skill) {
          return res.status(404).json({ message: 'skill not found' });
        }
        return skill;
      })
    );

    // Update the user's skills array with the new skill objects
    user.skills = skillObjects;

    await user.save();

    return res.status(200).json({ message: 'Skills updated successfully', skills });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateCategory = async (req, res) => {
  const { userId } = req.params;
  const { categories } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the skills in the database or create them if they don't exist
    const categoryObjects = await Promise.all(
      categories.map(async (categoryName) => {
        let category = await Category.findOne({ name: categoryName });
        if (!category) {
          return res.status(404).json({ message: 'category not found' });
        }
        return category;
      })
    );

    // Update the user's skills array with the new skill objects
    user.categories = categoryObjects;

    await user.save();

    return res.status(200).json({ message: 'categories updated successfully', categories });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const profilePic = async (req, res) => {
  const { userId } = req.params;
  const image = await cloudinary.uploader.upload(req.file.path, {
    folder: 'user/profilePic',
  });
  await User.findByIdAndUpdate(userId, { imageUrl: image.secure_url });

  console.log(image);
  res.json({ message: 'Done' });
};

const cv = async (req, res) => {
  const { userId } = req.params;
  const cv = await cloudinary.uploader.upload(req.file.path, {
    folder: 'user/CV',
  });
  await User.findByIdAndUpdate(userId, { CvUrl: cv.secure_url });

  console.log(cv);
  res.json({ message: 'Done' });
};

const deleteAccount = async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findById(userId).exec();
    if (!(await user.isPasswordMatch(password))) {
      return res.status(422).json({ message: 'Incorrect password enter the correct password to delete your account' });
    }
    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const createID = async (req, res) => {
  try {
    const { userId } = req.params;
    // Read the image file synchronously
    const imageData = fs.readFileSync(req.file.path);
    // Update the user's IDimage field with the image data
    const updatedUser = await User.findByIdAndUpdate(userId, { IDimage: imageData });
    await updatedUser.save();
    // Delete the temporary file from the file system
    fs.unlinkSync(req.file.path);
    // Send a success response
    res.status(200).json({ message: 'New image saved to database' });
  } catch (error) {
    // If an error occurs, log it and send an error response
    console.error(error);
    res.status(500).json({ message: 'Failed to save image to database' });
  }
};

const addPersonalProject = async (req, res) => {
  const { userId } = req.params;
  const { title, url } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'freelancer') {
      return res.status(401).json({ message: 'You are not authorized to perform this action' });
    }

    const project = { title, url };
    user.personal_projects.push(project);
    await user.save();
    return res.status(201).json({ project });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
const removePersonalProject = async (req, res) => {
  const { userId } = req.params;
  const { title } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'freelancer') {
      return res.status(401).json({ message: 'You are not authorized to perform this action' });
    }

    const projectIndex = user.personal_projects.findIndex((project) => project.title === title);
    if (projectIndex === -1) {
      return res.status(404).json({ message: 'Personal project not found' });
    }

    user.personal_projects.splice(projectIndex, 1);
    await user.save();
    return res.status(200).json({ message: 'Personal project removed successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getWorkHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const projects = await Project.find({
      $or: [{ client_id: userId }, { Freelancer_id: userId }],
      project_status: 'Complete',
    }).populate({
      path: 'job',
      model: Job,
      populate: [
        {
          path: 'skills',
          model: Skill,
        },
        {
          path: 'category',
          model: Category,
        },
      ],
    });
    return res.status(200).json({ projects });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  changePassword,
  getUser,
  updateUser,
  getUsers,
  updateSkills,
  updateCategory,
  profilePic,
  cv,
  deleteAccount,
  createID,
  addPersonalProject,
  getWorkHistory,
  removePersonalProject,
};
