export { FileTree } from "./ui/FileTree/FileTree";
export { TicketDrawer, parseSections } from "./ui/TicketDrawer/TicketDrawer";
export type { ParsedSection } from "./ui/TicketDrawer/TicketDrawer";
export { FileViewer } from "./ui/FileViewer/FileViewer";
export { ContentSearch } from "./ui/FileTree/ContentSearch";
export type { FileEntry } from "./model/types";
export {
  clearFolderHandle,
  loadFolderHandle,
  loadViewedPaths,
  markViewed,
  saveFolderHandle,
} from "./model/db";
export { canExtractText, extractTextFromFile } from "./model/extractText";
