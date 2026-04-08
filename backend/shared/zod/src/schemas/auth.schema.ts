import { zodConstants } from "@/constants";
import { zodValidator } from "@/utils";
import { object } from "zod";

export const registerOtpSchema = object({
  otp: zodValidator.string(zodConstants.options.string.OTP),
});
export const registerEmailSchema = object({
  email: zodValidator.string(zodConstants.options.string.EMAIL),
});

export const registerSchema = object({
  firstName: zodValidator.string({
    ...zodConstants.options.string.NAME,
    field: "firstName",
    label: "First name",
  }),
  lastName: zodValidator.string({
    ...zodConstants.options.string.NAME,
    field: "lastName",
    label: "Last name",
  }),
  otp: registerOtpSchema.shape.otp,
  email: registerEmailSchema.shape.email,
  phoneNumber: zodValidator.string(zodConstants.options.string.PHONE_NUMBER),
  password: zodValidator.string(zodConstants.options.string.PASSWORD),
  confirmPassword: zodValidator.string({
    ...zodConstants.options.string.PASSWORD,
    field: "confirmPassword",
    label: "Confirm Password",
  }),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    zodValidator.customIssue(ctx, "Passwords do not match", "confirmPassword");
  }
});

export const loginSchema = object({
  loginMethod: zodValidator.enum({
    enumValues: ["email", "phoneNumber"],
    field: "loginMethod",
    label: "Login method",
  }),
  email: registerSchema.shape.email.optional(),
  phoneNumber: registerSchema.shape.phoneNumber.optional(),
  password: registerSchema.shape.password,
}).superRefine((data, ctx) => {
  if (data.loginMethod === "email" && !data.email) {
    zodValidator.customIssue(ctx, "Email is required", "email");
  }
  if (data.loginMethod === "phoneNumber" && !data.phoneNumber) {
    zodValidator.customIssue(ctx, "Phone number is required", "phoneNumber");
  }
});
