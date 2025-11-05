export const eip712Example = {
  domain: {
    name: "Signator.IO",
    version: "1",
  },
  types: {
    Greeting: [
      { name: "salutation", type: "string" },
      { name: "target", type: "string" },
      { name: "born", type: "int32" },
    ],
  },
  primaryType: "Greeting",
  message: {
    salutation: "Hello",
    target: "Ethereum",
    born: 2015,
  },
} as const;

export type TypedDataChecks = {
  types: boolean;
  message: boolean;
  hash?: string | null;
};
