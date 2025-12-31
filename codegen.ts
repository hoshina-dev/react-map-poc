import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "http://localhost:8080/query",
  documents: ["graphql/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "./graphql/generated/": {
      preset: "client",
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ["prettier --write"],
  },
};

export default config;
