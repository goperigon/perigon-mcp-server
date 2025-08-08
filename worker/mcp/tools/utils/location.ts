/**
 * Location detection and parsing utilities for news search tools
 */

import { z } from "zod";

export type LocationType = "city" | "state" | "country";

export interface LocationFilter {
  city?: string[];
  state?: string[];
  country?: string[];
}

export interface LocationDetectionResult {
  filter: LocationFilter;
  detectedType: LocationType;
}

/**
 * Common US state abbreviations (lowercase)
 */
const US_STATES = [
  "al",
  "ak",
  "az",
  "ar",
  "ca",
  "co",
  "ct",
  "de",
  "fl",
  "ga",
  "hi",
  "id",
  "il",
  "in",
  "ia",
  "ks",
  "ky",
  "la",
  "me",
  "md",
  "ma",
  "mi",
  "mn",
  "ms",
  "mo",
  "mt",
  "ne",
  "nv",
  "nh",
  "nj",
  "nm",
  "ny",
  "nc",
  "nd",
  "oh",
  "ok",
  "or",
  "pa",
  "ri",
  "sc",
  "sd",
  "tn",
  "tx",
  "ut",
  "vt",
  "va",
  "wa",
  "wv",
  "wi",
  "wy",
];

/**
 * Common country codes (lowercase)
 */
const COMMON_COUNTRIES = [
  "us",
  "uk",
  "ca",
  "au",
  "de",
  "fr",
  "jp",
  "cn",
  "in",
  "br",
  "mx",
  "it",
  "es",
  "ru",
];

/**
 * Detect the type of location based on common patterns
 * @param location - The location string to analyze
 * @returns The detected location type
 */
export function detectLocationType(location: string): LocationType {
  const locationLower = location.toLowerCase();

  if (location.length === 2 && US_STATES.includes(locationLower)) {
    return "state";
  } else if (
    location.length === 2 &&
    COMMON_COUNTRIES.includes(locationLower)
  ) {
    return "country";
  } else if (
    locationLower.includes("county") ||
    locationLower.includes("city") ||
    locationLower.includes("town") ||
    locationLower.includes("village")
  ) {
    return "city";
  } else {
    // Default to treating as city for longer names
    return "city";
  }
}

/**
 * Parse a location string into the appropriate filter based on type detection or explicit type
 * @param location - The location string to parse
 * @param locationType - The explicit location type or "auto" for automatic detection
 * @returns Location detection result with filter and detected type
 */
export function parseLocation(
  location: string,
  locationType: "auto" | LocationType = "auto"
): LocationDetectionResult {
  const detectedType =
    locationType === "auto" ? detectLocationType(location) : locationType;

  const filter: LocationFilter = {};

  switch (detectedType) {
    case "city":
      filter.city = [location];
      break;
    case "state":
      filter.state = [location.toUpperCase()];
      break;
    case "country":
      filter.country = [location.toLowerCase()];
      break;
  }

  return {
    filter,
    detectedType,
  };
}

/**
 * Merge location filters with existing search parameters
 * @param existingParams - Existing search parameters that may contain location filters
 * @param newLocation - New location filter to merge
 * @returns Updated search parameters with merged location filters
 */
export function mergeLocationFilters(
  existingParams: any,
  newLocation: LocationFilter
): any {
  const params = { ...existingParams };

  if (newLocation.city) {
    params.city = [...(params.city || []), ...newLocation.city];
  }

  if (newLocation.state) {
    params.state = [...(params.state || []), ...newLocation.state];
  }

  if (newLocation.country) {
    params.country = [...(params.country || []), ...newLocation.country];
  }

  return params;
}

/**
 * Apply location filtering to search parameters
 * @param searchParams - Base search parameters
 * @param location - Location string to filter by
 * @param locationType - Type of location or "auto" for detection
 * @param query - Optional query string, will be set to location if not provided
 * @returns Updated search parameters with location filters applied
 */
export function applyLocationFilter(
  searchParams: any,
  location?: string,
  locationType: "auto" | LocationType = "auto",
  query?: string
): any {
  if (!location) {
    return searchParams;
  }

  const { filter } = parseLocation(location, locationType);
  const updatedParams = mergeLocationFilters(searchParams, filter);

  // If query is not provided but location is, include location in the query for better results
  if (!query) {
    updatedParams.q = location;
  }

  return updatedParams;
}

/**
 * Create location schema fields for use in tool parameter definitions
 * @returns Zod schema object with location and locationType fields
 */
export function createLocationSchema() {
  return {
    location: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Location to search for news about (city, state, or country name). Can be used in combination with other location filters (states, cities, countries)."
      ),
    locationType: z
      .enum(["auto", "city", "state", "country"])
      .default("auto")
      .describe("Type of location - 'auto' will try to detect automatically"),
  };
}
