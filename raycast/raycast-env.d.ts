/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-news` command */
  export type SearchNews = ExtensionPreferences & {}
  /** Preferences accessible in the `search-stories` command */
  export type SearchStories = ExtensionPreferences & {}
  /** Preferences accessible in the `my-monitors` command */
  export type MyMonitors = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-news` command */
  export type SearchNews = {}
  /** Arguments passed to the `search-stories` command */
  export type SearchStories = {}
  /** Arguments passed to the `my-monitors` command */
  export type MyMonitors = {}
}

