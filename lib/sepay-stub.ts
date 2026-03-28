/**
 * SePay PG Stub — placeholder until sepay-pg-node-sdk is available on npm.
 * Replace with real SDK when ready.
 */

export class SePayPgClient {
  private config: { env: string; merchant_id: string; secret_key: string };

  constructor(config: { env: string; merchant_id: string; secret_key: string }) {
    this.config = config;
  }

  checkout = {
    initCheckoutUrl: (): string => {
      const base =
        this.config.env === "production"
          ? "https://my.sepay.vn/checkout"
          : "https://sandbox.sepay.vn/checkout";
      return base;
    },

    initOneTimePaymentFields: (params: Record<string, unknown>): Record<string, string> => {
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(params)) {
        fields[key] = String(value ?? "");
      }
      return fields;
    },
  };
}
