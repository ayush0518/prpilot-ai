import { classifyFile, getLanguage } from "@/app/utils/fileClassifier";

describe("fileClassifier", () => {
  describe("classifyFile", () => {
    it("should classify .tsx files as UI Component", () => {
      expect(classifyFile("Button.tsx")).toBe("UI Component");
      expect(classifyFile("HomePage.tsx")).toBe("UI Component");
    });

    it("should classify .jsx files as UI Component", () => {
      expect(classifyFile("Card.jsx")).toBe("UI Component");
      expect(classifyFile("Modal.jsx")).toBe("UI Component");
    });

    it("should classify test files as Test File", () => {
      expect(classifyFile("utils.test.ts")).toBe("Test File");
      expect(classifyFile("service.spec.ts")).toBe("Test File");
      expect(classifyFile("Button.test.tsx")).toBe("Test File");
      expect(classifyFile("Component.spec.jsx")).toBe("Test File");
    });

    it("should classify configuration files as Configuration", () => {
      expect(classifyFile("package.json")).toBe("Configuration");
      expect(classifyFile(".env.local")).toBe("Configuration");
      expect(classifyFile("tsconfig.json")).toBe("Configuration");
      expect(classifyFile("webpack.config.js")).toBe("Configuration");
      expect(classifyFile("app.yaml")).toBe("Configuration");
      expect(classifyFile("settings.yml")).toBe("Configuration");
      expect(classifyFile("config.toml")).toBe("Configuration");
      expect(classifyFile("app.xml")).toBe("Configuration");
    });

    it("should classify GraphQL files as API Layer", () => {
      expect(classifyFile("schema.graphql")).toBe("API Layer");
      expect(classifyFile("queries.gql")).toBe("API Layer");
    });

    it("should classify TypeScript/JavaScript files as Business Logic", () => {
      expect(classifyFile("utils.ts")).toBe("Business Logic");
      expect(classifyFile("service.ts")).toBe("Business Logic");
      expect(classifyFile("helper.js")).toBe("Business Logic");
      expect(classifyFile("middleware.mts")).toBe("Business Logic");
      expect(classifyFile("index.mjs")).toBe("Business Logic");
    });

    it("should classify unknown files as Other", () => {
      expect(classifyFile("document.pdf")).toBe("Other");
      expect(classifyFile("image.png")).toBe("Other");
      expect(classifyFile("data.csv")).toBe("Other");
      expect(classifyFile("README")).toBe("Other");
    });

    it("should be case insensitive", () => {
      expect(classifyFile("Component.TSX")).toBe("UI Component");
      expect(classifyFile("package.JSON")).toBe("Configuration");
      expect(classifyFile("test.SPEC.TS")).toBe("Test File");
    });

    it("should handle edge cases", () => {
      expect(classifyFile("")).toBe("Other");
      expect(classifyFile("noextension")).toBe("Other");
    });
  });

  describe("getLanguage", () => {
    it("should map TypeScript extensions", () => {
      expect(getLanguage("file.ts")).toBe("TypeScript");
      expect(getLanguage("file.mts")).toBe("TypeScript");
      expect(getLanguage("file.tsx")).toBe("TypeScript React");
    });

    it("should map JavaScript extensions", () => {
      expect(getLanguage("file.js")).toBe("JavaScript");
      expect(getLanguage("file.mjs")).toBe("JavaScript");
      expect(getLanguage("file.jsx")).toBe("JavaScript React");
    });

    it("should map common language extensions", () => {
      expect(getLanguage("script.py")).toBe("Python");
      expect(getLanguage("Main.java")).toBe("Java");
      expect(getLanguage("program.go")).toBe("Go");
      expect(getLanguage("lib.rs")).toBe("Rust");
      expect(getLanguage("app.rb")).toBe("Ruby");
    });

    it("should map web-related extensions", () => {
      expect(getLanguage("style.css")).toBe("CSS");
      expect(getLanguage("style.scss")).toBe("SCSS");
      expect(getLanguage("style.less")).toBe("Less");
      expect(getLanguage("index.html")).toBe("HTML");
      expect(getLanguage("schema.graphql")).toBe("GraphQL");
    });

    it("should map config extensions", () => {
      expect(getLanguage("config.json")).toBe("JSON");
      expect(getLanguage("config.yaml")).toBe("YAML");
      expect(getLanguage("query.sql")).toBe("SQL");
    });

    it("should return Unknown for unmapped extensions", () => {
      expect(getLanguage("file.unknown")).toBe("Unknown");
      expect(getLanguage("file.xyz")).toBe("Unknown");
    });

    it("should be case insensitive", () => {
      expect(getLanguage("FILE.TS")).toBe("TypeScript");
      expect(getLanguage("FILE.PY")).toBe("Python");
    });

    it("should handle files without extensions", () => {
      expect(getLanguage("Dockerfile")).toBe("Unknown");
      expect(getLanguage("Makefile")).toBe("Unknown");
    });
  });
});
