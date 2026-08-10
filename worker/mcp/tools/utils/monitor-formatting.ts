import {
  MonitorDto,
  MonitorEventDto,
  MonitorNewsletterDto,
  MonitorSummaryDto
} from "../../../types/monitors";
import { createPaginationHeader } from "./formatting";

const MAX_TOOL_OUTPUT_CHARS = 40_000;
const MAX_MONITOR_CONFIG_CHARS = 16_000;
const MAX_EVENT_DATA_CHARS = 6_000;
const MAX_NEWSLETTER_CONTENT_CHARS = 8_000;
const MAX_SUMMARY_CHARS = 5_000;
const MAX_ARTICLES_PER_ITEM = 5;

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}… [truncated ${value.length - maxChars} characters]`;
}

// Attribute values are delimiter-sensitive, so they are fully escaped. Text
// content is emitted verbatim so JSON stays valid for round-tripping into
// update_monitor and newsletter markdown stays readable.
function escapeAttribute(
  value: string | number | boolean | null | undefined
): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function text(value: string | number | boolean | null | undefined): string {
  return String(value ?? "");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function limitObjectKeys(
  obj: Record<string, unknown>,
  maxKeys: number
): Record<string, unknown> {
  const entries = Object.entries(obj);
  if (entries.length <= maxKeys) return obj;
  return Object.fromEntries(entries.slice(0, maxKeys));
}

function truncateDeepStrings(value: unknown, maxStringLength: number): unknown {
  if (typeof value === "string") {
    if (value.length <= maxStringLength) return value;
    return `${value.slice(0, maxStringLength)}…`;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => truncateDeepStrings(entry, maxStringLength));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        truncateDeepStrings(entry, maxStringLength)
      ])
    );
  }
  return value;
}

function shrinkMonitorConfiguration(
  config: Record<string, unknown>,
  options: {
    maxSchemaFields?: number;
    maxStringLength?: number;
    omitFields?: string[];
  }
): Record<string, unknown> {
  let result: Record<string, unknown> = { ...config };

  for (const field of options.omitFields ?? []) {
    const { [field]: _omitted, ...rest } = result;
    result = rest;
  }

  if (options.maxStringLength !== undefined) {
    result = truncateDeepStrings(result, options.maxStringLength) as Record<
      string,
      unknown
    >;
  }

  if (
    options.maxSchemaFields !== undefined &&
    isPlainObject(result.dataSchema)
  ) {
    const dataSchema = result.dataSchema;
    if (isPlainObject(dataSchema.schema)) {
      result = {
        ...result,
        dataSchema: {
          ...dataSchema,
          schema: limitObjectKeys(dataSchema.schema, options.maxSchemaFields)
        }
      };
    }
  }

  return result;
}

function buildMonitorConfigurationAttempts(
  config: Record<string, unknown>
): Array<{ value: Record<string, unknown>; notice?: string }> {
  const schemaFieldCount =
    isPlainObject(config.dataSchema) && isPlainObject(config.dataSchema.schema)
      ? Object.keys(config.dataSchema.schema).length
      : 0;

  const attempts: Array<{ value: Record<string, unknown>; notice?: string }> = [
    { value: config }
  ];

  for (const maxSchemaFields of [100, 50, 25, 10, 5]) {
    if (schemaFieldCount > maxSchemaFields) {
      attempts.push({
        value: shrinkMonitorConfiguration(config, { maxSchemaFields }),
        notice: `Configuration shortened to ${maxSchemaFields} of ${schemaFieldCount} dataSchema fields to stay within output limits. Do not treat this block as a complete update_monitor payload.`
      });
    }
  }

  for (const maxStringLength of [2_000, 1_000, 500]) {
    attempts.push({
      value: shrinkMonitorConfiguration(config, { maxStringLength }),
      notice:
        "Long configuration strings were shortened to stay within output limits. Do not treat this block as a complete update_monitor payload."
    });
  }

  for (const omitFields of [
    ["contactPointIds"],
    ["contactPointIds", "entityGroups"],
    ["contactPointIds", "entityGroups", "prompt"],
    [
      "contactPointIds",
      "entityGroups",
      "prompt",
      "schedulePolicy",
      "newsletterConfig"
    ]
  ]) {
    attempts.push({
      value: shrinkMonitorConfiguration(config, { omitFields }),
      notice: `Configuration omitted ${omitFields.join(", ")} to stay within output limits. Do not treat this block as a complete update_monitor payload.`
    });
  }

  return attempts;
}

function formatJsonWithinLimit(
  value: unknown,
  maxChars: number,
  shrinkAttempts?: Array<{ value: unknown; notice?: string }>
): { json: string; notice?: string } {
  const attempts = shrinkAttempts ?? [{ value }];

  for (const attempt of attempts) {
    const json = JSON.stringify(attempt.value, null, 2);
    if (json.length <= maxChars) {
      return { json, notice: attempt.notice };
    }
  }

  const originalLength = JSON.stringify(value, null, 2).length;
  return {
    json: JSON.stringify(
      {
        _truncated: true,
        _originalCharacterCount: originalLength,
        _message:
          "Content exceeds the display limit and could not be reduced while preserving parseable JSON."
      },
      null,
      2
    ),
    notice:
      "Configuration could not be included in full. Use get_monitor on a monitor with a smaller configuration, or update individual fields without copying the entire configuration block."
  };
}

function formatJson(value: unknown, maxChars: number): string {
  return formatJsonWithinLimit(value, maxChars).json;
}

function joinWithinLimit(
  header: string,
  openingTag: string,
  sections: string[],
  closingTag: string
): string {
  let output = `${header}\n${openingTag}\n`;
  let included = 0;

  for (const section of sections) {
    if (
      output.length + section.length + closingTag.length >
      MAX_TOOL_OUTPUT_CHARS
    ) {
      break;
    }
    output += `${section}\n`;
    included += 1;
  }

  if (included < sections.length) {
    output += `<truncated>${sections.length - included} additional results omitted from this response. Request a smaller page or the next page.</truncated>\n`;
  }

  return `${output}${closingTag}`;
}

function formatMonitorSummary(monitor: MonitorDto): string {
  return `<monitor uuid="${escapeAttribute(monitor.uuid)}">
Name: ${text(monitor.name)}
Status: ${text(monitor.status)}
Classification: ${text(monitor.classificationType)}
Objective: ${text(monitor.monitoringObjective)}
Created At: ${text(monitor.createdAt)}
Updated At: ${text(monitor.updatedAt)}
</monitor>`;
}

export function formatMonitorList(
  monitors: MonitorDto[],
  total: number,
  page: number,
  size: number
): string {
  return joinWithinLimit(
    createPaginationHeader(total, page, size, "monitors"),
    "<monitors>",
    monitors.map(formatMonitorSummary),
    "</monitors>"
  );
}

export function formatMonitorDetail(monitor: MonitorDto): string {
  const configuration = {
    prompt: monitor.prompt,
    dataSchema: monitor.dataSchema,
    newsletterConfig: monitor.newsletterConfig,
    entityGroups: monitor.entityGroups,
    query: monitor.query,
    schedulePolicy: monitor.schedulePolicy,
    watchlistId: monitor.watchlistId,
    contactPointIds: monitor.contactPointIds
  };

  const { json: configurationJson, notice: configurationNotice } =
    formatJsonWithinLimit(
      configuration,
      MAX_MONITOR_CONFIG_CHARS,
      buildMonitorConfigurationAttempts(configuration)
    );

  return `<monitor uuid="${escapeAttribute(monitor.uuid)}">
Name: ${text(monitor.name)}
Status: ${text(monitor.status)}
Classification: ${text(monitor.classificationType)}
Objective: ${text(monitor.monitoringObjective)}
Created At: ${text(monitor.createdAt)}
Updated At: ${text(monitor.updatedAt)}
<configuration>
${configurationJson}
</configuration>${configurationNotice ? `\n<truncated>${text(configurationNotice)}</truncated>` : ""}
</monitor>`;
}

function formatEvent(event: MonitorEventDto): string {
  const articles = Object.entries(event.articles ?? {});
  const formattedArticles = articles
    .slice(0, MAX_ARTICLES_PER_ITEM)
    .map(
      ([articleId, article]) =>
        `<article id="${escapeAttribute(articleId)}" url="${escapeAttribute(article.url)}">${text(article.title)}</article>`
    )
    .join("\n");
  const omittedArticles = articles.length - MAX_ARTICLES_PER_ITEM;

  return `<event uuid="${escapeAttribute(event.uuid)}">
Event Type: ${text(event.eventType)}
Event Date: ${text(event.eventDate)}
Created At: ${text(event.createdAt)}
Summary: ${truncate(event.summary ?? "", MAX_SUMMARY_CHARS)}
Entities: ${formatJson(event.entities ?? [], 2_000)}
<data>
${formatJson(event.data ?? {}, MAX_EVENT_DATA_CHARS)}
</data>
<articles>
${formattedArticles}
${omittedArticles > 0 ? `<truncated>${omittedArticles} additional articles omitted.</truncated>` : ""}
</articles>
</event>`;
}

export function formatMonitorEvents(
  events: MonitorEventDto[],
  total: number,
  page: number,
  size: number
): string {
  return joinWithinLimit(
    createPaginationHeader(total, page, size, "monitor events"),
    "<events>",
    events.map(formatEvent),
    "</events>"
  );
}

function formatNewsletter(newsletter: MonitorNewsletterDto): string {
  const articles = Object.entries(newsletter.articles ?? {});
  const formattedArticles = articles
    .slice(0, MAX_ARTICLES_PER_ITEM)
    .map(
      ([articleId, article]) =>
        `<article id="${escapeAttribute(articleId)}" url="${escapeAttribute(article.url)}">${text(article.title)}</article>`
    )
    .join("\n");
  const omittedArticles = articles.length - MAX_ARTICLES_PER_ITEM;

  return `<newsletter uuid="${escapeAttribute(newsletter.uuid)}">
Title: ${text(newsletter.title)}
Created At: ${text(newsletter.createdAt)}
Updated At: ${text(newsletter.updatedAt)}
<content>
${truncate(newsletter.content, MAX_NEWSLETTER_CONTENT_CHARS)}
</content>
<articles>
${formattedArticles}
${omittedArticles > 0 ? `<truncated>${omittedArticles} additional articles omitted.</truncated>` : ""}
</articles>
Story Count: ${Object.keys(newsletter.stories ?? {}).length}
</newsletter>`;
}

export function formatMonitorNewsletters(
  newsletters: MonitorNewsletterDto[],
  total: number,
  page: number,
  size: number
): string {
  return joinWithinLimit(
    createPaginationHeader(total, page, size, "monitor newsletters"),
    "<newsletters>",
    newsletters.map(formatNewsletter),
    "</newsletters>"
  );
}

function formatSummary(summary: MonitorSummaryDto): string {
  return `<summary>
Created At: ${text(summary.createdAt)}
Updated At: ${text(summary.updatedAt)}
Text: ${truncate(summary.text, MAX_SUMMARY_CHARS)}
</summary>`;
}

export function formatMonitorSummaries(
  summaries: MonitorSummaryDto[],
  total: number,
  page: number,
  size: number
): string {
  return joinWithinLimit(
    createPaginationHeader(total, page, size, "monitor summaries"),
    "<summaries>",
    summaries.map(formatSummary),
    "</summaries>"
  );
}
