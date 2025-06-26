import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { AuthIntrospectionResponse } from "../types/types";
import { typedFetch } from "./typed-fetch";

const BASE_URL = "https://api.perigon.io/v1";

export class Perigon extends V1Api {
  private apiKey: string;

  constructor(apiKey: string) {
    super(new Configuration({ apiKey }));
    this.apiKey = apiKey;
  }

  async introspection(): Promise<AuthIntrospectionResponse> {
    return await typedFetch<AuthIntrospectionResponse>(
      `${BASE_URL}/auth/introspect`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );
  }
}
