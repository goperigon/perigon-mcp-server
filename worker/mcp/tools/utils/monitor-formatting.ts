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

function formatJson(value: unknown, maxChars: number): string {
  return truncate(JSON.stringify(value, null, 2), maxChars);
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

  return `<monitor uuid="${escapeAttribute(monitor.uuid)}">
Name: ${text(monitor.name)}
Status: ${text(monitor.status)}
Classification: ${text(monitor.classificationType)}
Objective: ${text(monitor.monitoringObjective)}
Created At: ${text(monitor.createdAt)}
Updated At: ${text(monitor.updatedAt)}
<configuration>
${formatJson(configuration, MAX_MONITOR_CONFIG_CHARS)}
</configuration>
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
