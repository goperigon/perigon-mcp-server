import { z } from "zod";
import {
  MonitorArrayElementSchemaProperty,
  MonitorDataSchemaProperty,
  MonitorPrimitiveSchemaProperty,
  MonitorQuery
} from "../../../types/monitors";

const PRIMITIVE_PROPERTY_TYPES = [
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "ENUM",
  "INTEGER",
  "NUMBER",
  "STRING",
  "URL"
] as const;

// Returns a fresh object each call so JSON Schema conversion never sees the
// same Zod instance twice. Reused instances collapse into $ref pointers,
// which strict-mode MCP clients (e.g. OpenAI function calling) reject.
const basePropertyFields = () => ({
  description: z
    .string()
    .optional()
    .describe("Instructions describing the value to extract for this field."),
  nullable: z
    .boolean()
    .default(true)
    .describe("Whether the extracted value may be null."),
  required: z
    .boolean()
    .default(true)
    .describe("Whether the field must appear in extracted event data.")
});

interface PrimitiveConstraintFields {
  type: string;
  values?: string[];
  min?: number;
  max?: number;
}

function checkPrimitiveConstraints(
  value: PrimitiveConstraintFields,
  ctx: z.RefinementCtx
): void {
  if (value.type === "ENUM" && (!value.values || value.values.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["values"],
      message: "values must contain at least one entry when type is ENUM."
    });
  }
  if (value.type === "INTEGER") {
    if (value.min !== undefined && !Number.isInteger(value.min)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["min"],
        message: "min must be an integer when type is INTEGER."
      });
    }
    if (value.max !== undefined && !Number.isInteger(value.max)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["max"],
        message: "max must be an integer when type is INTEGER."
      });
    }
  }
}

interface PrimitivePropertyFields {
  type: (typeof PRIMITIVE_PROPERTY_TYPES)[number];
  description?: string;
  nullable: boolean;
  required: boolean;
  values?: string[];
  min?: number;
  max?: number;
}

function toPrimitiveProperty(
  value: PrimitivePropertyFields
): MonitorPrimitiveSchemaProperty {
  const base = {
    description: value.description,
    nullable: value.nullable,
    required: value.required
  };
  switch (value.type) {
    case "ENUM":
      return { type: "ENUM", ...base, values: value.values! };
    case "INTEGER":
      return { type: "INTEGER", ...base, min: value.min, max: value.max };
    case "NUMBER":
      return { type: "NUMBER", ...base, min: value.min, max: value.max };
    default:
      return { type: value.type, ...base };
  }
}

// A single flat shape (rather than a discriminated union of ten near-identical
// object types) so the generated JSON Schema has no $ref pointers. Fields
// irrelevant to `type` are accepted but dropped by the transform below, so
// the value sent to the API always matches the shape for its declared type.
const primitiveSchemaPropertyArgs = () =>
  z
    .object({
      type: z
        .enum(PRIMITIVE_PROPERTY_TYPES)
        .describe(
          "Value type. ENUM requires values; INTEGER and NUMBER may set min/max."
        ),
      ...basePropertyFields(),
      values: z
        .array(z.string())
        .optional()
        .describe("Allowed string values. Required when type is ENUM."),
      min: z
        .number()
        .optional()
        .describe("Minimum value. Only used when type is INTEGER or NUMBER."),
      max: z
        .number()
        .optional()
        .describe("Maximum value. Only used when type is INTEGER or NUMBER.")
    })
    .superRefine(checkPrimitiveConstraints)
    .transform(toPrimitiveProperty);

interface ArrayElementPropertyFields {
  type: (typeof PRIMITIVE_PROPERTY_TYPES)[number] | "OBJECT";
  description?: string;
  nullable: boolean;
  required: boolean;
  values?: string[];
  min?: number;
  max?: number;
  allowExtra?: boolean;
  shape?: Record<string, MonitorPrimitiveSchemaProperty>;
}

function toArrayElementProperty(
  value: ArrayElementPropertyFields
): MonitorArrayElementSchemaProperty {
  if (value.type === "OBJECT") {
    return {
      type: "OBJECT",
      description: value.description,
      nullable: value.nullable,
      required: value.required,
      allowExtra: value.allowExtra ?? false,
      shape: value.shape ?? {}
    };
  }
  // `value.type` is confirmed not "OBJECT" above; TS cannot narrow the whole
  // object across this function-call boundary from a single property check.
  return toPrimitiveProperty(value as PrimitivePropertyFields);
}

const arrayElementSchemaPropertyArgs = () =>
  z
    .object({
      type: z
        .enum([...PRIMITIVE_PROPERTY_TYPES, "OBJECT"])
        .describe(
          "Value type for each array element. OBJECT requires shape; ENUM requires values; INTEGER and NUMBER may set min/max."
        ),
      ...basePropertyFields(),
      values: z
        .array(z.string())
        .optional()
        .describe("Allowed string values. Required when type is ENUM."),
      min: z
        .number()
        .optional()
        .describe("Minimum value. Only used when type is INTEGER or NUMBER."),
      max: z
        .number()
        .optional()
        .describe("Maximum value. Only used when type is INTEGER or NUMBER."),
      allowExtra: z
        .boolean()
        .optional()
        .describe(
          "Whether the object may contain fields not defined in shape. Only used when type is OBJECT."
        ),
      shape: z
        .record(primitiveSchemaPropertyArgs())
        .optional()
        .describe(
          "Primitive field definitions keyed by object field name. Required when type is OBJECT."
        )
    })
    .superRefine((value, ctx) => {
      checkPrimitiveConstraints(value, ctx);
      if (value.type === "OBJECT" && !value.shape) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["shape"],
          message: "shape is required when type is OBJECT."
        });
      }
    })
    .transform(toArrayElementProperty);

export const monitorDataSchemaArgs = z.object({
  version: z.literal("V1").default("V1"),
  allowExtra: z
    .boolean()
    .default(false)
    .describe(
      "Whether event data may contain fields not defined in this schema."
    ),
  schema: z
    .record(
      z
        .object({
          type: z
            .enum([...PRIMITIVE_PROPERTY_TYPES, "OBJECT", "ARRAY"])
            .describe(
              "Value type. ARRAY requires element; OBJECT requires shape; ENUM requires values; INTEGER and NUMBER may set min/max."
            ),
          ...basePropertyFields(),
          values: z
            .array(z.string())
            .optional()
            .describe("Allowed string values. Required when type is ENUM."),
          min: z
            .number()
            .optional()
            .describe(
              "Minimum value. Only used when type is INTEGER or NUMBER."
            ),
          max: z
            .number()
            .optional()
            .describe(
              "Maximum value. Only used when type is INTEGER or NUMBER."
            ),
          allowExtra: z
            .boolean()
            .optional()
            .describe(
              "Whether the object may contain fields not defined in shape. Only used when type is OBJECT."
            ),
          shape: z
            .record(primitiveSchemaPropertyArgs())
            .optional()
            .describe(
              "Primitive field definitions keyed by object field name. Required when type is OBJECT."
            ),
          element: arrayElementSchemaPropertyArgs()
            .optional()
            .describe(
              "Schema applied to each value in the array. Required when type is ARRAY."
            )
        })
        .superRefine((value, ctx) => {
          checkPrimitiveConstraints(value, ctx);
          if (value.type === "OBJECT" && !value.shape) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["shape"],
              message: "shape is required when type is OBJECT."
            });
          }
          if (value.type === "ARRAY" && !value.element) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["element"],
              message: "element is required when type is ARRAY."
            });
          }
        })
        .transform((value): MonitorDataSchemaProperty => {
          if (value.type === "ARRAY") {
            return {
              type: "ARRAY",
              description: value.description,
              nullable: value.nullable,
              required: value.required,
              element: value.element!
            };
          }
          // `value.type` is confirmed not "ARRAY" above; TS cannot narrow the
          // whole object across this function-call boundary from a single
          // property check.
          return toArrayElementProperty(value as ArrayElementPropertyFields);
        })
    )
    .describe("Structured event field definitions keyed by output field name.")
});

export const monitorNewsletterConfigArgs = z.object({
  citations: z
    .boolean()
    .default(true)
    .describe("Whether generated newsletters include citations."),
  storyCitationResolvingType: z
    .enum(["STORY", "TOP_ARTICLE"])
    .describe("Whether citations resolve to a story or its top article.")
});

export const monitorEntityGroupArgs = z.object({
  groupReference: z
    .string()
    .min(1)
    .describe("Stable name used to identify this entity group in output."),
  description: z
    .string()
    .optional()
    .describe("Instructions describing which entities belong in the group.")
});

const dayOfWeek = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY"
]);

const scheduleIntervalArgs = z
  .object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    days: z
      .array(dayOfWeek)
      .min(1)
      .max(7)
      .optional()
      .describe("Days for a WEEKLY schedule."),
    daysOfMonth: z
      .array(z.number().int().min(1).max(31))
      .min(1)
      .max(31)
      .optional()
      .describe("Days of the month for a MONTHLY schedule."),
    scheduleType: z.enum(["WEEKLY", "MONTHLY"]).default("WEEKLY")
  })
  .superRefine((interval, context) => {
    if (interval.scheduleType === "WEEKLY" && !interval.days?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "days is required for a WEEKLY schedule",
        path: ["days"]
      });
    }
    if (interval.scheduleType === "MONTHLY" && !interval.daysOfMonth?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "daysOfMonth is required for a MONTHLY schedule",
        path: ["daysOfMonth"]
      });
    }
  });

export const monitorSchedulePolicyArgs = z.object({
  intervals: z
    .array(scheduleIntervalArgs)
    .min(1)
    .max(24)
    .describe("One to 24 times when the monitor runs."),
  timezoneId: z
    .string()
    .default("UTC")
    .describe("IANA time zone used to interpret the schedule.")
});

// Returns a fresh instance per call so JSON Schema conversion inlines each
// occurrence instead of emitting internal $ref pointers.
const sentimentScore = () => z.number().min(0).max(1);

export const monitorQueryArgs = z.object({
  q: z
    .string()
    .optional()
    .describe(
      "Search article title, description, and content using keywords or Boolean syntax."
    ),
  title: z.string().optional().describe("Search within article titles."),
  content: z.string().optional().describe("Search within article bodies."),
  source: z
    .array(z.string())
    .optional()
    .describe("Include publisher domains. Supports * and ? wildcards."),
  excludeSource: z
    .array(z.string())
    .optional()
    .describe("Exclude publisher domains. Supports * and ? wildcards."),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe("Include Perigon source groups."),
  country: z
    .array(z.string().length(2))
    .optional()
    .describe("Include two-letter article country codes."),
  language: z
    .array(z.string().length(2))
    .optional()
    .describe("Include ISO 639 two-letter language codes."),
  category: z
    .array(z.string())
    .optional()
    .describe("Include article categories."),
  topic: z.array(z.string()).optional().describe("Include article topics."),
  label: z.array(z.string()).optional().describe("Include editorial labels."),
  excludeLabel: z
    .array(z.string())
    .optional()
    .describe("Exclude editorial labels."),
  watchlist: z
    .array(z.string())
    .optional()
    .describe("Include articles mentioning entities from these watchlists."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe("Include articles mentioning companies with these domains."),
  personName: z
    .array(z.string())
    .optional()
    .describe("Include articles mentioning these exact person names."),
  journalistId: z
    .array(z.string().length(32))
    .optional()
    .describe("Include articles written by these Perigon journalist IDs."),
  medium: z
    .array(z.string())
    .optional()
    .describe("Include content types such as Article or Video."),
  positiveSentimentFrom: sentimentScore().optional(),
  positiveSentimentTo: sentimentScore().optional(),
  negativeSentimentFrom: sentimentScore().optional(),
  negativeSentimentTo: sentimentScore().optional(),
  neutralSentimentFrom: sentimentScore().optional(),
  neutralSentimentTo: sentimentScore().optional(),
  paywall: z
    .boolean()
    .optional()
    .describe("Filter by whether the publisher has a paywall."),
  type: z
    .enum(["all", "local", "world"])
    .optional()
    .describe("Filter by geographic content scope."),
  searchTranslation: z
    .boolean()
    .optional()
    .describe("Search translated text for non-English articles."),
  queryAdvanced: z
    .record(z.unknown())
    .optional()
    .describe(
      "Advanced ComplexAllEndpointQuery fields not exposed above, including AND, OR, and NOT arrays. Common typed fields override duplicate keys."
    )
});

export function buildMonitorQuery(
  input: z.output<typeof monitorQueryArgs>
): MonitorQuery {
  const { queryAdvanced, ...commonFields } = input;
  return {
    ...(queryAdvanced ?? {}),
    ...commonFields
  } as MonitorQuery;
}

export const monitorStatus = z.enum(["DRAFT", "ACTIVE", "STOPPED", "ARCHIVED"]);

export const monitorClassificationType = z.enum(["EVENT", "MENTIONS", "TOPIC"]);

export const monitorPaginationArgs = z.object({
  page: z.number().int().min(0).default(0).describe("Zero-based page number."),
  size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of results to return."),
  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc")
    .describe("Sort direction."),
  nulls: z
    .enum(["first", "last"])
    .optional()
    .describe("Placement of null values in sorted results.")
});

export const monitorDateParam = () =>
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Use an ISO 8601 timestamp or yyyy-mm-dd date"
  });
