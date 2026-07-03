export interface MockExportData {
  name?: string;
  columns: string[];
  preview: Record<string, unknown>[];
  rowCount: number;
}

/** Mock export payloads for the export-viewer dev preview harness. */
export const MOCK_EXPORTS: Record<string, MockExportData> = {
  small: {
    name: "layoff_events_by_company.jsonl",
    columns: ["companyName", "eventDate", "peopleAffected", "industry"],
    rowCount: 4,
    preview: [
      {
        companyName: "Atlas Robotics",
        eventDate: "2026-01-14",
        peopleAffected: 600,
        industry: "Manufacturing",
      },
      {
        companyName: "Bravo Media",
        eventDate: "2026-02-02",
        peopleAffected: 1200,
        industry: "Media",
      },
      {
        companyName: "Cerro Health",
        eventDate: "2026-02-19",
        peopleAffected: 400,
        industry: "Healthcare",
      },
      {
        companyName: "Delta Logistics",
        eventDate: "2026-03-05",
        peopleAffected: 800,
        industry: null,
      },
    ],
  },
  large: {
    name: "funding_rounds_2026.jsonl",
    columns: ["companyName", "round", "amountUsd", "date", "investors"],
    rowCount: 128,
    preview: Array.from({ length: 25 }, (_, i) => ({
      companyName: `Company ${i + 1}`,
      round: ["Seed", "Series A", "Series B", "Series C"][i % 4],
      amountUsd: (i + 1) * 1_000_000,
      date: `2026-0${(i % 6) + 1}-1${i % 9}`,
      investors: { lead: `Fund ${i % 5}`, count: (i % 3) + 1 },
    })),
  },
  empty: {
    name: "no_matching_events.jsonl",
    columns: [],
    rowCount: 0,
    preview: [],
  },
};
