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

const US_STATE_CODES_BY_NAME = new Map<string, string>(Object.entries({
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
}));

/**
 * Common names that differ from the English region names Intl provides.
 * The API only knows `gb` for the United Kingdom.
 */
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  uk: "gb",
  usa: "us",
  america: "us",
  "united states of america": "us",
  britain: "gb",
  "great britain": "gb",
  england: "gb",
  scotland: "gb",
  wales: "gb",
  "northern ireland": "gb",
  turkey: "tr",
  "czech republic": "cz",
  "ivory coast": "ci",
  burma: "mm",
  holland: "nl",
  uae: "ae",
  china: "cn",
  palestine: "ps",
  "democratic republic of the congo": "cd",
  drc: "cd",
  "republic of the congo": "cg",
};

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Current ISO 3166-1 alpha-2 codes; Intl also names deprecated codes (DD, VD) after their successors. */
const ISO_COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU",
  "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL",
  "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC",
  "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV",
  "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG",
  "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD",
  "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT",
  "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
  "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
  "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH",
  "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR",
  "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR",
  "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC",
  "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL",
  "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY",
  "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA",
  "ZM", "ZW",
];

let countryCodesByName: Map<string, string> | undefined;

/** English country names → lowercase ISO 3166-1 alpha-2 codes, built once from Intl. */
function getCountryCodesByName(): Map<string, string> {
  if (countryCodesByName) return countryCodesByName;
  const map = new Map<string, string>();
  try {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    for (const code of ISO_COUNTRY_CODES) {
      const name = regionNames.of(code);
      if (!name || name === code) continue;
      // "Myanmar (Burma)" → also "myanmar"
      for (const variant of [name, name.replace(/\s*\(.*\)$/, "")]) {
        map.set(normalizeName(variant), code.toLowerCase());
      }
    }
  } catch {
    // Without Intl region names, only codes and aliases resolve.
  }
  for (const [alias, code] of Object.entries(COUNTRY_CODE_ALIASES)) {
    map.set(alias, code);
  }
  countryCodesByName = map;
  return map;
}

/** Resolve a US state code or name (e.g. "tx", "Texas") to its uppercase code. */
export function resolveStateCode(location: string): string | undefined {
  const trimmed = location.trim();
  if (/^[a-z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return US_STATE_CODES_BY_NAME.get(normalizeName(trimmed));
}

/** Resolve a country code or name (e.g. "fr", "France", "UK") to its lowercase code. */
export function resolveCountryCode(location: string): string | undefined {
  const trimmed = location.trim();
  if (/^[a-z]{2}$/i.test(trimmed)) {
    const code = trimmed.toLowerCase();
    return COUNTRY_CODE_ALIASES[code] ?? code;
  }
  return getCountryCodesByName().get(normalizeName(trimmed));
}

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
  } else if (US_STATE_CODES_BY_NAME.has(normalizeName(location))) {
    return "state";
  } else if (location.length > 2 && resolveCountryCode(location)) {
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
 * Parse a location string into the appropriate filter based on type detection or explicit type.
 * State and country names are resolved to codes; a name that cannot be resolved yields an empty filter.
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
    case "state": {
      const code = resolveStateCode(location);
      if (code) filter.state = [code];
      break;
    }
    case "country": {
      const code = resolveCountryCode(location);
      if (code) filter.country = [code];
      break;
    }
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
  } else if (Object.keys(filter).length === 0) {
    // Unresolvable state/country names still narrow the search, as text.
    updatedParams.q = `(${query}) AND "${location.replace(/"/g, "")}"`;
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
        "Location to search for news about: a city, a US state name or code, or a country name or code. Names are resolved to codes (France → fr, Texas → TX). Can be used in combination with other location filters (states, cities, countries); when set, countries no longer defaults to us."
      ),
    locationType: z
      .enum(["auto", "city", "state", "country"])
      .default("auto")
      .describe("Type of location - 'auto' will try to detect automatically"),
  };
}
