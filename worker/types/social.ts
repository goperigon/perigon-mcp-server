/**
 * Request params and response DTOs of the `/v1/social/*` endpoints
 * (business-api-server: com.gawq.api.rest.social.SocialController). Enum
 * params are sent as the API's uppercase enum names.
 */

export interface SocialSearchResult<T> {
  status: number;
  numResults: number;
  results: T[];
  /** Cursor-paginated endpoints (X, Reddit, LinkedIn feeds). */
  nextCursor?: string | null;
  /** Page-paginated endpoints (LinkedIn post search). */
  nextPage?: number | null;
}

export type XSearchType = "TOP" | "LATEST" | "MEDIA";

export interface XPostSearchParams {
  q: string;
  searchType?: XSearchType;
  cursor?: string;
}

export interface SocialXPost {
  id: string;
  url: string;
  text?: string | null;
  lang?: string | null;
  createdAt?: string | null;
  author: { screenName: string; avatarUrl?: string | null };
  views?: number | null;
  likes?: number | null;
  reposts?: number | null;
  replies?: number | null;
  quotes?: number | null;
  bookmarks?: number | null;
  photoUrls?: string[] | null;
  videoUrls?: string[] | null;
}

export type RedditSort = "RELEVANCE" | "HOT" | "TOP" | "NEW" | "COMMENTS";
export type RedditTime = "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR" | "ALL";

export interface RedditPostSearchParams {
  q: string;
  subreddit?: string;
  sort?: RedditSort;
  time?: RedditTime;
  cursor?: string;
}

export interface SocialRedditPost {
  id: string;
  fullname?: string | null;
  title?: string | null;
  text?: string | null;
  author?: string | null;
  subreddit?: string | null;
  subredditPrefixed?: string | null;
  subredditSubscribers?: number | null;
  url?: string | null;
  linkUrl?: string | null;
  domain?: string | null;
  flair?: string | null;
  postHint?: string | null;
  score?: number | null;
  upvotes?: number | null;
  upvoteRatio?: number | null;
  numComments?: number | null;
  numCrossposts?: number | null;
  totalAwardsReceived?: number | null;
  createdAt?: string | null;
  isVideo?: boolean | null;
  isSelf?: boolean | null;
  over18?: boolean | null;
  spoiler?: boolean | null;
  stickied?: boolean | null;
  locked?: boolean | null;
  archived?: boolean | null;
  thumbnail?: string | null;
}

export type LinkedInSortBy = "DATE_POSTED" | "RELEVANCE";
export type LinkedInDatePosted = "PAST_24H" | "PAST_WEEK" | "PAST_MONTH";
export type LinkedInContentType =
  | "PHOTOS"
  | "VIDEOS"
  | "JOBS"
  | "LIVE_VIDEOS"
  | "DOCUMENTS";

export interface LinkedInPostSearchParams {
  q: string;
  sortBy?: LinkedInSortBy;
  datePosted?: LinkedInDatePosted;
  contentType?: LinkedInContentType;
  authorTitle?: string;
  page?: number;
}

export interface SocialLinkedInPost {
  urn: string;
  url?: string | null;
  text?: string | null;
  postedAt?: string | null;
  reposted?: boolean | null;
  author?: {
    id?: string | null;
    fullName?: string | null;
    username?: string | null;
    type?: string | null;
    url?: string | null;
    urn?: string | null;
    profilePictureUrl?: string | null;
  } | null;
  reactions?: number | null;
  likes?: number | null;
  empathy?: number | null;
  appreciation?: number | null;
  praise?: number | null;
  interest?: number | null;
  funny?: number | null;
  maybe?: number | null;
  comments?: number | null;
}

export type LinkedInPersonActivityType = "POSTS" | "COMMENTS" | "REACTIONS";
export type LinkedInCompanyPostsType = "ALL" | "ARTICLES" | "DOCUMENTS";

export interface LinkedInFeedParams<TType extends string> {
  url: string;
  type?: TType;
  cursor?: string;
}

export interface SocialLinkedInFeedPost {
  activityType?: string | null;
  urn?: string | null;
  url?: string | null;
  shareUrl?: string | null;
  text?: string | null;
  createdAt?: string | null;
  isRepost?: boolean | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  reactions?: Array<{ reactionType: string; count?: number | null }> | null;
  attachmentTypes?: string[] | null;
  author?: {
    name?: string | null;
    publicIdentifier?: string | null;
    occupation?: string | null;
    type?: string | null;
    url?: string | null;
    followers?: number | null;
  } | null;
  sharedPost?: SocialLinkedInFeedPost | null;
  originalPostUrl?: string | null;
  comment?: {
    urn?: string | null;
    url?: string | null;
    text?: string | null;
    createdAt?: string | null;
    likes?: number | null;
  } | null;
  reactionText?: string | null;
}
