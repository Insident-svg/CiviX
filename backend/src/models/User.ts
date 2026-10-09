import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Government-only login identifier. Citizens leave this empty.
    // Sparse+unique allows many citizen documents with no governmentId.
    governmentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin'],
      default: 'citizen',
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationTokenHash: {
      type: String,
      default: null,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },

    passwordResetTokenHash: {
      type: String,
      default: null,
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
    },

    profileImage: {
      type: String,
    },

    // Private WhatsApp destination and consent metadata. Grievance APIs only
    // populate safe public user fields, so this number is not exposed to others.
    whatsappNotifications: {
      enabled: { type: Boolean, default: false },
      phoneNumber: { type: String, trim: true, maxlength: 20 },
      consentAt: { type: Date },
    },

    blocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.virtual('id').get(function () {
  return this._id.toString();
});

export const User = model('User', userSchema);
