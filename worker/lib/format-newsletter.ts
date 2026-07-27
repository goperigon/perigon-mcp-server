/**
 * Format a newsletter JSON payload as model-readable markdown with YAML frontmatter.
 * Mirrors pokey formatNewsletterMarkdown.
 */
export function formatNewsletterMarkdown(newsletter: {
  uuid: string;
  signalUuid: string;
  signalName: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}): string {
  const frontmatter = [
    "---",
    `uuid: ${newsletter.uuid}`,
    `signalUuid: ${newsletter.signalUuid}`,
    `signalName: ${escapeYamlScalar(newsletter.signalName)}`,
    `title: ${escapeYamlScalar(newsletter.title)}`,
    `createdAt: ${newsletter.createdAt}`,
    `updatedAt: ${newsletter.updatedAt}`,
    "---",
  ].join("\n");

  return `${frontmatter}\n\n# ${newsletter.title}\n\n${newsletter.content}`;
}

function escapeYamlScalar(value: string): string {
  if (
    /[:#{}[\],&*?|>!%@`]/.test(value) ||
    value.includes("\n") ||
    value.includes('"')
  ) {
    return JSON.stringify(value);
  }
  return value;
}
