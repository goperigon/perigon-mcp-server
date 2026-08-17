import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ContactPointDto } from "../../../types/platform";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const contactPointsArgs = z.object({
  uuid: z.string().uuid().optional().describe("Get one contact point by UUID."),
  status: z
    .array(z.enum(["PENDING", "ACTIVE", "DISABLED"]))
    .optional()
    .describe("List mode: filter by lifecycle status."),
  type: z
    .array(z.enum(["EMAIL", "WEBHOOK"]))
    .optional()
    .describe("List mode: filter by delivery channel type."),
  page: z.number().min(0).default(0),
  size: z.number().min(1).max(100).default(10),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

function formatContactPoint(c: ContactPointDto): string {
  return `<contact_point uuid="${c.uuid}" name="${c.name}">
Type: ${c.type}
Status: ${c.status}
Verified: ${c.isVerified}
Email: ${c.email ?? "N/A"}
Webhook URL: ${c.webhookUrl ?? "N/A"}
</contact_point>`;
}

export function getContactPoints(
  perigon: Perigon,
): ToolCallback<typeof contactPointsArgs> {
  return async ({
    uuid,
    status,
    type,
    page,
    size,
    sortBy,
    sortOrder,
  }: z.infer<typeof contactPointsArgs>): Promise<CallToolResult> => {
    try {
      if (uuid) {
        const result = await perigon.getContactPoint(uuid);
        return toolResult(formatContactPoint(result.data));
      }

      const result = await perigon.listContactPoints({
        status,
        type,
        page,
        size,
        sortBy,
        sortOrder,
      });
      if (result.total === 0) return noResults;
      let output = createPaginationHeader(result.total, page, size, "contact points");
      output += `\n<contact_points>\n${result.data.map(formatContactPoint).join("\n\n")}\n</contact_points>`;
      return toolResult(output);
    } catch (error) {
      console.error("Error fetching contact points:", error);
      return toolResult(
        `Error: Failed to fetch contact points: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const contactPointsTool = {
  name: "contact_points",
  title: "List or get contact points",
  description:
    "List or get by UUID the organization's contact points (delivery channels used by monitor notifications — email or webhook). Read-only; use this to find a contactPointId before wiring it into create_monitor/update_monitor.",
  parameters: contactPointsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => getContactPoints(perigon),
} satisfies ToolDefinition<typeof contactPointsArgs>;
