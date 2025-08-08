export interface User {
  id: string;
  email: string;
  name?: string;
  imageUrl: string | null;
}

export interface PerigonApiKey {
  id: string;
  token: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  preview: string;
  organizationId: number;
}

export class PerigonAuthService {
  public async validatePerigonUser(): Promise<User | null> {
    try {
      const response = await fetch("/v1/validate-user", {
        credentials: "include",
      });

      if (response.ok) {
        return (await response.json()) as User;
      } else if (response.status === 401) {
        return null;
      } else {
        console.error(
          `User validation failed: ${response.status} ${response.statusText}`
        );
        return null;
      }
    } catch (error) {
      console.error("Error validating Perigon user:", error);
      return null;
    }
  }

  public async fetchApiKeys(): Promise<PerigonApiKey[]> {
    try {
      const response = await fetch("/v1/perigon-api-keys", {
        credentials: "include",
      });

      if (response.ok) {
        return (await response.json()) as PerigonApiKey[];
      } else {
        console.error(
          `API keys fetch failed: ${response.status} ${response.statusText}`
        );
        return [];
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
      return [];
    }
  }
}
