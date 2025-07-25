const Joi = require('joi');

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message
      });
    }
    next();
  };
};

// User registration schema
const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    })
});

// User login schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Note creation schema
const noteSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),
  content: Joi.string()
    .max(50000)
    .allow('')
    .default('')
    .messages({
      'string.max': 'Content cannot exceed 50,000 characters'
    }),
  tags: Joi.string()
    .max(500)
    .allow('')
    .default('')
    .messages({
      'string.max': 'Tags cannot exceed 500 characters'
    }),
  status: Joi.string()
    .valid('private', 'shared', 'public')
    .default('private')
    .messages({
      'any.only': 'Status must be private, shared, or public'
    })
});

// Note update schema
const updateNoteSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 200 characters'
    }),
  content: Joi.string()
    .max(50000)
    .allow('')
    .messages({
      'string.max': 'Content cannot exceed 50,000 characters'
    }),
  tags: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Tags cannot exceed 500 characters'
    }),
  status: Joi.string()
    .valid('private', 'shared', 'public')
    .messages({
      'any.only': 'Status must be private, shared, or public'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Share note schema
const shareSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  permission: Joi.string()
    .valid('read', 'write')
    .default('read')
    .messages({
      'any.only': 'Permission must be read or write'
    })
});

// Update profile schema
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Change password schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    })
});

// Search validation
const searchSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'Search query cannot be empty',
      'string.max': 'Search query cannot exceed 100 characters'
    }),
  tags: Joi.string()
    .max(200)
    .messages({
      'string.max': 'Tags filter cannot exceed 200 characters'
    }),
  status: Joi.string()
    .valid('private', 'shared', 'public')
    .messages({
      'any.only': 'Status must be private, shared, or public'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Offset cannot be negative'
    })
});

// Query parameter validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message
      });
    }
    req.query = value; // Replace with validated values
    next();
  };
};

// Parameter validation middleware
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message
      });
    }
    next();
  };
};

// ID parameter schema
const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'ID must be a positive number',
      'any.required': 'ID is required'
    })
});

// Token parameter schema
const tokenParamSchema = Joi.object({
  token: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid token format',
      'any.required': 'Token is required'
    })
});

module.exports = {
  validate,
  validateQuery,
  validateParams,
  registerSchema,
  loginSchema,
  noteSchema,
  updateNoteSchema,
  shareSchema,
  updateProfileSchema,
  changePasswordSchema,
  searchSchema,
  idParamSchema,
  tokenParamSchema
};