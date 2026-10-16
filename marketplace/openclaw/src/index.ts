import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "perigon",
  name: "Perigon",
  description: "Perigon MCP server plugin for OpenClaw",
  
  register() {
    // OpenClaw will automatically connect to the MCP server defined in the manifest
    // and make all tools available through its native MCP client.
    // No additional registration is needed here since the mcpServers field
    // in openclaw.plugin.json handles the server configuration.
    
    // The plugin activates when users enable it and configure their API key
    // or complete OAuth authentication via: openclaw mcp login perigon
  },
});
