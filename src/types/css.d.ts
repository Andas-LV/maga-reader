declare module "*.css";
declare module "*.scss";

// Pre-built browser bundle for mammoth — same API as the main package
declare module "mammoth/mammoth.browser" {
  import mammoth = require("mammoth");
  export = mammoth;
}
