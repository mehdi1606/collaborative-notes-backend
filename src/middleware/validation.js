const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }
    next();
  };
};

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const noteSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().allow(''),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
  visibility: Joi.string().valid('private', 'shared', 'public').default('private')
});

const updateNoteSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  content: Joi.string().allow(''),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
  visibility: Joi.string().valid('private', 'shared', 'public')
});

const shareSchema = Joi.object({
  email: Joi.string().email().required(),
  permission: Joi.string().valid('read', 'write').default('read')
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  noteSchema,
  updateNoteSchema,
  shareSchema
};