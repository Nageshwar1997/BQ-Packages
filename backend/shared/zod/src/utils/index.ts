import {
  IZodEnumsConfigs,
  IZodNumberConfigs,
  IZodStringConfigs,
} from "@/types";
import constants from "bq-shared-constants";
import {
  enum as z_enum,
  number,
  string,
  ZodNumber,
  ZodString,
  ZodEnum,
  RefinementCtx,
} from "zod";

const appendCustomIssue = (
  ctx: RefinementCtx,
  message: string,
  fieldPath?: string | number,
) => {
  const path = fieldPath !== undefined ? [fieldPath] : [];
  return ctx.addIssue({ path, code: "custom", message });
};

const validateString = (props: IZodStringConfigs): ZodString => {
  let schema = string().trim();

  const {
    field,
    label,
    allowSpace = "singleSpace",
    customRegexes,
    customRegex,
    lowerOrUpper,
    max,
    min,
    nonEmpty = true,
    parentField,
    parentLabel,
  } = props;

  const baseName = label ?? field;
  const parentName = parentLabel ?? parentField;
  const name = parentName ? `${parentName}: ${baseName}` : baseName;

  if (nonEmpty) {
    schema = schema.nonempty({ message: `${name} is required.` });

    if (min !== undefined) {
      schema = schema.min(min, `${name} must be at least ${min} characters.`);
    }

    if (max !== undefined) {
      schema = schema.max(max, `${name} must not exceed ${max} characters.`);
    }
  }

  if (allowSpace === "singleSpace") {
    schema = schema.regex(
      constants.regex.SINGLE_SPACE,
      `${name} must not contain multiple spaces.`,
    );
  } else if (allowSpace === "noSpace") {
    schema = schema.regex(
      constants.regex.NO_SPACE,
      `${name} must not contain spaces.`,
    );
  }

  if (customRegexes?.length) {
    customRegexes.forEach(({ regex, message }) => {
      schema = schema.regex(regex, `${name} ${message}.`);
    });
  }

  if (customRegex) {
    schema = schema.regex(customRegex.regex, `${name} ${customRegex.message}.`);
  }

  if (lowerOrUpper === "lower") {
    schema = schema.toLowerCase();
  } else if (lowerOrUpper === "upper") {
    schema = schema.toUpperCase();
  }

  return schema;
};

const validateNumber = (props: IZodNumberConfigs): ZodNumber => {
  let schema = number();

  const {
    field,
    label,
    min,
    max,
    parentField,
    parentLabel,
    isInt = false,
    isPositive = true,
    isNegative = false,
  } = props;

  const baseName = label ?? field;
  const parentName = parentLabel ?? parentField;
  const name = parentName ? `${parentName}: ${baseName}` : baseName;

  if (min !== undefined) {
    schema = schema.min(min, `${name} must be at least ${min}.`);
  }

  if (max !== undefined) {
    schema = schema.max(max, `${name} must not exceed ${max}.`);
  }

  if (isInt) {
    schema = schema.int(`${name} must be an integer.`);
  }

  if (isPositive) {
    schema = schema.positive(`${name} must be a positive number.`);
  }

  if (isNegative) {
    schema = schema.negative(`${name} must be a negative number.`);
  }

  return schema;
};

const validateEnum = ({
  enumValues,
  field,
  label,
  parentField,
  parentLabel,
}: IZodEnumsConfigs): ZodEnum => {
  return z_enum(enumValues, {
    error: (issue) => {
      const path = issue.path ?? [];

      // get index from path
      const index = [...path].reverse().find((p) => typeof p === "number");

      // replace [some_index] with actual index
      const resolvedField =
        index !== undefined
          ? field.replace("[some_index]", String(index))
          : field;
      const resolvedLabel =
        index !== undefined
          ? label.replace("[some_index]", String(index))
          : label;

      const baseName = resolvedLabel || resolvedField;
      const parentName = parentLabel ?? parentField;

      const name = parentName ? `${parentName}: ${baseName}` : baseName;

      return `${name} is required. Must be one of: ${enumValues.join(", ")}.`;
    },
  });
};

export const zodValidator = {
  string: validateString,
  number: validateNumber,
  enum: validateEnum,
  customIssue: appendCustomIssue,
};
