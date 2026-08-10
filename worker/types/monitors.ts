export type MonitorStatus = "DRAFT" | "ACTIVE" | "STOPPED" | "ARCHIVED";
export type MonitorClassificationType = "EVENT" | "MENTIONS" | "TOPIC";
export type MonitorSortOrder = "asc" | "desc";
export type MonitorNulls = "first" | "last";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface MonitorSchemaPropertyBase {
  description?: string;
  nullable: boolean;
  required: boolean;
}

export interface MonitorBooleanSchemaProperty extends MonitorSchemaPropertyBase {
  type: "BOOLEAN";
}

export interface MonitorDateSchemaProperty extends MonitorSchemaPropertyBase {
  type: "DATE";
}

export interface MonitorDatetimeSchemaProperty extends MonitorSchemaPropertyBase {
  type: "DATETIME";
}

export interface MonitorEnumSchemaProperty extends MonitorSchemaPropertyBase {
  type: "ENUM";
  values: string[];
}

export interface MonitorIntegerSchemaProperty extends MonitorSchemaPropertyBase {
  type: "INTEGER";
  min?: number;
  max?: number;
}

export interface MonitorNumberSchemaProperty extends MonitorSchemaPropertyBase {
  type: "NUMBER";
  min?: number;
  max?: number;
}

export interface MonitorStringSchemaProperty extends MonitorSchemaPropertyBase {
  type: "STRING";
}

export interface MonitorUrlSchemaProperty extends MonitorSchemaPropertyBase {
  type: "URL";
}

export type MonitorPrimitiveSchemaProperty =
  | MonitorBooleanSchemaProperty
  | MonitorDateSchemaProperty
  | MonitorDatetimeSchemaProperty
  | MonitorEnumSchemaProperty
  | MonitorIntegerSchemaProperty
  | MonitorNumberSchemaProperty
  | MonitorStringSchemaProperty
  | MonitorUrlSchemaProperty;

export interface MonitorObjectSchemaProperty extends MonitorSchemaPropertyBase {
  type: "OBJECT";
  allowExtra: boolean;
  shape: Record<string, MonitorPrimitiveSchemaProperty>;
}

export type MonitorArrayElementSchemaProperty =
  | MonitorPrimitiveSchemaProperty
  | MonitorObjectSchemaProperty;

export interface MonitorArraySchemaProperty extends MonitorSchemaPropertyBase {
  type: "ARRAY";
  element: MonitorArrayElementSchemaProperty;
}

export type MonitorDataSchemaProperty =
  | MonitorArrayElementSchemaProperty
  | MonitorArraySchemaProperty;

export interface MonitorDataSchema {
  version: "V1";
  allowExtra: boolean;
  schema: Record<string, MonitorDataSchemaProperty>;
}

export interface MonitorNewsletterConfig {
  citations: boolean;
  storyCitationResolvingType: "STORY" | "TOP_ARTICLE";
}

export interface MonitorEntityGroup {
  groupReference: string;
  description?: string;
}

export interface MonitorScheduleInterval {
  hour: number;
  minute: number;
  days?: string[];
  daysOfMonth?: number[];
  scheduleType: "WEEKLY" | "MONTHLY";
}

export interface MonitorSchedulePolicy {
  intervals: MonitorScheduleInterval[];
  timezoneId: string;
}

export type MonitorQuery = Record<string, JsonValue>;

export interface MonitorCreateRequest {
  name: string;
  status: "ACTIVE" | "DRAFT";
  classificationType: MonitorClassificationType;
  monitoringObjective: string;
  prompt?: string;
  dataSchema: MonitorDataSchema;
  newsletterConfig?: MonitorNewsletterConfig;
  entityGroups?: MonitorEntityGroup[];
  query: MonitorQuery;
  schedulePolicy?: MonitorSchedulePolicy;
  watchlistId?: number;
  contactPointIds?: string[];
}

export interface MonitorUpdateRequest {
  name?: string;
  classificationType?: MonitorClassificationType;
  monitoringObjective?: string;
  prompt?: string | null;
  dataSchema?: MonitorDataSchema;
  newsletterConfig?: MonitorNewsletterConfig | null;
  entityGroups?: MonitorEntityGroup[];
  query?: MonitorQuery;
  schedulePolicy?: MonitorSchedulePolicy | null;
  watchlistId?: number | null;
  contactPointIds?: string[];
}

export interface MonitorDto {
  uuid: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: MonitorStatus;
  classificationType: MonitorClassificationType | null;
  monitoringObjective: string | null;
  prompt: string | null;
  dataSchema: MonitorDataSchema | null;
  newsletterConfig: MonitorNewsletterConfig | null;
  entityGroups: MonitorEntityGroup[];
  query: MonitorQuery | null;
  schedulePolicy: MonitorSchedulePolicy | null;
  watchlistId: number | null;
  contactPointIds: string[];
}

export interface MonitorArticlePartialDto {
  title: string | null;
  url: string | null;
  domain: string | null;
  pubDate: string | null;
  sourceFavicon: string | null;
  highlights: Record<string, string[]> | null;
}

export interface MonitorMatchedEntityDto {
  name: string;
  type: string;
  domain: string | null;
}

export interface MonitorEventDto {
  uuid: string;
  createdAt: string;
  updatedAt: string;
  eventDate?: string;
  eventType: string;
  data: Record<string, JsonValue>;
  relatedArticleIds: string[];
  articles: Record<string, MonitorArticlePartialDto>;
  entities: MonitorMatchedEntityDto[];
  summary: string | null;
  fillbotMetadata?: JsonValue;
  fillbotScheduleAt?: string;
  fillbotLastRunAt?: string;
  fillbotStatus?: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "EXHAUSTED";
  duplicate?: boolean;
}

export interface MonitorNewsletterStoryPartialDto {
  slug: string | null;
  url: string | null;
  title: string | null;
  sourceFavicon: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface MonitorNewsletterDto {
  uuid: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  content: string;
  articles: Record<string, MonitorArticlePartialDto>;
  stories: Record<string, MonitorNewsletterStoryPartialDto>;
}

export interface MonitorSummaryDto {
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorTableResult<T> {
  total: number;
  data: T[];
}

export interface MonitorSingleResult<T> {
  data: T;
}

export interface MonitorPaginationParams {
  page: number;
  size: number;
  sortBy: string;
  sortOrder: MonitorSortOrder;
  nulls?: MonitorNulls;
}

export interface MonitorListParams extends MonitorPaginationParams {
  uuid?: string[];
  name?: string;
  status?: MonitorStatus[];
  classificationType?: MonitorClassificationType[];
}

export interface MonitorOutputListParams extends MonitorPaginationParams {
  from?: string;
  to?: string;
}

export interface MonitorEventListParams extends MonitorOutputListParams {
  eventType?: string;
}

export interface MonitorNewsletterListParams extends MonitorOutputListParams {
  title?: string;
}
