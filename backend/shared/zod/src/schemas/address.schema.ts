import { array, boolean, object } from "zod";
import { registerSchema } from "./auth.schema";
import { zodValidator } from "@/utils";
import { zodConstants } from "@/constants";
import constants from "bq-shared-constants";

const addressBaseSchema = object({
  address: zodValidator.string(zodConstants.options.string.ADDRESS),
  landmark: zodValidator
    .string({
      field: "landmark",
      label: "Landmark",
      allowSpace: "singleSpace",
      min: 2,
      nonEmpty: false,
    })
    .optional(),
  city: zodValidator.string({
    field: "city",
    label: "City",
    allowSpace: "singleSpace",
    min: 2,
  }),
  gst: zodValidator
    .string({
      field: "gst",
      label: "GST Number",
      allowSpace: "noSpace",
      min: 15,
      max: 15,
      customRegex: { regex: constants.regex.GST, message: "must be valid" },
      nonEmpty: false,
    })
    .optional(),
  pinCode: zodValidator.string({
    field: "pinCode",
    label: "Pin Code",
    min: 6,
    max: 6,
    allowSpace: "noSpace",
    customRegex: { regex: constants.regex.PIN_CODE, message: "must be valid" },
  }),
  state: zodValidator.string({
    field: "state",
    label: "State",
    allowSpace: "singleSpace",
    min: 2,
  }),
  country: zodValidator
    .enum({
      field: "country",
      label: "Country",
      enumValues: constants.address.ALLOWED_COUNTRIES,
    })
    .default("India"),
  type: zodValidator
    .enum({
      field: "type",
      label: "Address Type",
      enumValues: constants.address.ADDRESS_TYPES,
    })
    .default("both"),
  firstName: registerSchema.shape.firstName,
  lastName: registerSchema.shape.lastName,
  email: registerSchema.shape.email,
  phoneNumber: registerSchema.shape.phoneNumber,
  altPhoneNumber: zodValidator
    .string({
      ...zodConstants.options.string.PHONE_NUMBER,
      field: "altPhoneNumber",
      label: "Alternate Phone Number",
      nonEmpty: false,
    })
    .optional(),
  isDefaultAddress: boolean({ error: "isDefaultAddress must be a boolean" })
    .default(false)
    .optional(),
});

export const addAddressSchema = addressBaseSchema.superRefine(
  ({ altPhoneNumber, phoneNumber }, ctx) => {
    if (altPhoneNumber && phoneNumber === altPhoneNumber) {
      zodValidator.customIssue(
        ctx,
        "Alternate phone number cannot be the same as phone number",
        "altPhoneNumber",
      );
    }
  },
);

export const updateAddressSchema = addressBaseSchema
  .extend({
    removedOptionalFields: array(
      zodValidator.enum({
        field: "[some_index]",
        label: "[some_index]",
        parentLabel: "Removed Optional Fields",
        parentField: "removedOptionalFields",
        enumValues: ["altPhoneNumber", "gst", "landmark"],
      }),
    ),
  })
  .partial()
  .superRefine(({ altPhoneNumber, phoneNumber }, ctx) => {
    if (altPhoneNumber && phoneNumber === altPhoneNumber) {
      zodValidator.customIssue(
        ctx,
        "Alternate phone number cannot be the same as phone number",
        "altPhoneNumber",
      );
    }
  });
