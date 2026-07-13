// ============================================================================
// Page Builder — Section Library (Save & Reuse Components)
// ============================================================================

import React, { useState, useCallback, useEffect } from "react";
import type { BuilderComponentNode } from "@/lib/page-builder/types";
import {
  getSavedSections,
  saveSection,
  deleteSection,
  importSection,
  updateSectionTree,
  exportSectionToJson,
  exportAllSectionsToJson,
  importSectionsFromJson,
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  addSectionToFolder,
  removeSectionFromFolder,
  getUncategorizedSections,
  getSectionsByFolder,
  getSectionFolderId,
  type SavedSection,
  type SectionFolder,
} from "@/lib/page-builder/section-library";
import {
  MARKETPLACE_SECTIONS,
  MARKETPLACE_CATEGORIES,
  searchMarketplaceSections,
} from "@/lib/page-builder/marketplace-sections";
import { deserializeTree, regenerateIds } from "@/lib/page-builder/utils";
import { SectionPreview } from "./SectionPreview";
import { X, Save, Trash2, Plus, Globe, FileText, Search, RefreshCw, Download, Upload, LayoutGrid, Bookmark, Eye, Folder, FolderPlus, Pencil, Check } from "lucide-react";

/* ─── Props ────────────────────────────────────────────────────────── */

interface SectionLibraryProps {
  open: boolean;
  onClose: () => void;
  /** Callback when user selects a section to insert */
  onInsertSection: (tree: BuilderComponentNode) => void;
  /** The currently selected component tree (to save as section) */
  selectedTree?: BuilderComponentNode | null;
}

/* ─── Section Library ─────────────────────────────────────────────── */

export function SectionLibrary({
  open,
  onClose,
  onInsertSection,
  selectedTree,
}: SectionLibraryProps) {
  const [sections, setSections] = useState<SavedSection[]>([]);
  const [search, setSearch] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; errors: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"saved" | "marketplace">("saved");

  // Folder state
  const [folders, setFolders] = useState<SectionFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = "all", "__uncategorized__" = uncategorized
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load sections when opened
  useEffect(() => {
    if (open) {
      setSections(getSavedSections());
      setFolders(getFolders());
      setSearch("");
      setImportResult(null);
      setActiveTab("saved");
      setSelectedFolderId(null);
    }
  }, [open]);

  // Compute which sections to show based on folder filter + search
  const sectionsInView = React.useMemo(() => {
    if (activeTab !== "saved") return [];
    let filtered = sections;
    // Filter by folder
    if (selectedFolderId === "__uncategorized__") {
      filtered = getUncategorizedSections(filtered);
    } else if (selectedFolderId) {
      filtered = getSectionsByFolder(selectedFolderId);
    }
    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [sections, selectedFolderId, search, activeTab]);

  // Marketplace search filter
  const marketplaceSectionsFiltered = activeTab === "marketplace" && search
    ? searchMarketplaceSections(search)
    : MARKETPLACE_SECTIONS;

  const handleSave = useCallback(() => {
    if (!selectedTree || !saveName.trim()) return;
    saveSection({
      name: saveName.trim(),
      description: saveDesc.trim(),
      tree: selectedTree,
      isGlobal,
    });
    setSections(getSavedSections());
    setShowSaveDialog(false);
    setSaveName("");
    setSaveDesc("");
    setIsGlobal(false);
  }, [selectedTree, saveName, saveDesc, isGlobal]);

  const handleInsert = useCallback(
    (id: string) => {
      const tree = importSection(id);
      if (tree) {
        onInsertSection(tree);
        onClose();
      }
    },
    [onInsertSection, onClose],
  );

  const handleDelete = useCallback((id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      removeSectionFromFolder(id);
      deleteSection(id);
      setSections(getSavedSections());
    }
  }, []);

  /** Add a marketplace section to the user's saved library. */
  const handleAddFromMarketplace = useCallback((marketplaceSection: (typeof MARKETPLACE_SECTIONS)[number]) => {
    try {
      const tree = deserializeTree(marketplaceSection.tree);
      const copy = regenerateIds(tree);
      saveSection({
        name: marketplaceSection.name,
        description: marketplaceSection.description,
        tree: copy,
        isGlobal: false,
      });
      setSections(getSavedSections());
    } catch {
      // Silently fail if deserialization fails
    }
  }, []);

  /** Insert a marketplace section directly into the page. */
  const handleInsertMarketplace = useCallback((marketplaceSection: (typeof MARKETPLACE_SECTIONS)[number]) => {
    try {
      const tree = deserializeTree(marketplaceSection.tree);
      const copy = regenerateIds(tree);
      copy.name = `${marketplaceSection.name} (Imported)`;
      onInsertSection(copy);
      onClose();
    } catch {
      // Silently fail
    }
  }, [onInsertSection, onClose]);

  const handleExport = useCallback((id: string, name: string) => {
    const data = exportSectionToJson(id);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()}-section.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportAll = useCallback(() => {
    if (sections.length === 0) return;
    const data = exportAllSectionsToJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-sections-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sections]);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const result = importSectionsFromJson(text);
      setImportResult(result);
      setSections(getSavedSections());
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  /* ── Folder handlers ───────────────────────────────────────────── */

  const handleCreateFolder = useCallback(() => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolder(name);
    setFolders(getFolders());
    setNewFolderName("");
    setShowNewFolderInput(false);
  }, [newFolderName]);

  const handleStartRenameFolder = useCallback((folder: SectionFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  }, []);

  const handleFinishRenameFolder = useCallback(() => {
    if (editingFolderId && editingFolderName.trim()) {
      renameFolder(editingFolderId, editingFolderName.trim());
      setFolders(getFolders());
    }
    setEditingFolderId(null);
    setEditingFolderName("");
  }, [editingFolderId, editingFolderName]);

  const handleDeleteFolder = useCallback((id: string, name: string) => {
    if (window.confirm(`Delete folder "${name}"? Sections inside will be uncategorized.`)) {
      deleteFolder(id);
      setFolders(getFolders());
      if (selectedFolderId === id) setSelectedFolderId(null);
    }
  }, [selectedFolderId]);

  const handleMoveSectionToFolder = useCallback((sectionId: string, folderId: string | null) => {
    if (folderId) {
      addSectionToFolder(folderId, sectionId);
    } else {
      removeSectionFromFolder(sectionId);
    }
    setFolders(getFolders());
  }, []);

  /** Pre-compute folder section counts from state (no localStorage reads). */
  const folderCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of folders) {
      counts.set(f.id, f.sectionIds.filter((sid) => sections.some((s) => s.id === sid)).length);
    }
    return counts;
  }, [folders, sections]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === "marketplace" ? (
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
            <h3 className="text-sm font-semibold">Section Library</h3>
            {activeTab === "saved" && (
              <span className="text-[0.5rem] text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded-full">
                {sections.length} saved
              </span>
            )}
            {activeTab === "marketplace" && (
              <span className="text-[0.5rem] text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded-full">
                {MARKETPLACE_SECTIONS.length} bundled
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Import JSON — only in saved tab */}
            {activeTab === "saved" && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.5rem] font-medium border border-border/60 rounded-lg hover:bg-secondary/40 transition-colors"
                title="Import sections from JSON file"
              >
                <Upload className="h-3 w-3" /> Import
              </button>
            )}
            {/* Export all — only in saved tab */}
            {activeTab === "saved" && sections.length > 0 && (
              <button
                onClick={handleExportAll}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.5rem] font-medium border border-border/60 rounded-lg hover:bg-secondary/40 transition-colors"
                title="Export all sections as JSON"
              >
                <Download className="h-3 w-3" /> Export All
              </button>
            )}
            {/* Save current selection */}
            {selectedTree && activeTab === "saved" && (
              <button
                onClick={() => {
                  setSaveName(selectedTree.name || "Untitled Section");
                  setShowSaveDialog(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.5rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                <Save className="h-3 w-3" /> Save Current
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/40 px-6">
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[0.5rem] font-medium border-b-2 transition-colors ${
              activeTab === "saved"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground/60 hover:text-foreground hover:border-foreground/30"
            }`}
          >
            <Bookmark className="h-3 w-3" />
            My Saved
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[0.5rem] font-medium border-b-2 transition-colors ${
              activeTab === "marketplace"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground/60 hover:text-foreground hover:border-foreground/30"
            }`}
          >
            <LayoutGrid className="h-3 w-3" />
            Marketplace
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === "marketplace" ? "Search marketplace…" : "Search saved sections…"}
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-border/40 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
            />
          </div>
        </div>

        {/* Section / Marketplace list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "marketplace" ? (
            /* ── Marketplace View ─────────────────────────────── */
            marketplaceSectionsFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <LayoutGrid className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-xs">No marketplace sections matching "{search}"</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group by category */}
                {MARKETPLACE_CATEGORIES.map((cat) => {
                  const catSections = marketplaceSectionsFiltered.filter((s) => s.category === cat.id);
                  if (catSections.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs">{cat.icon}</span>
                        <h4 className="text-[0.5rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
                          {cat.label}
                        </h4>
                        <span className="text-[0.4rem] text-muted-foreground/40">
                          {catSections.length} section{catSections.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {catSections.map((section) => {
                          const catInfo = MARKETPLACE_CATEGORIES.find((c) => c.id === section.category);
                          return (
                            <div
                              key={section.id}
                              className="group relative border border-border/40 rounded-xl hover:border-foreground/30 hover:bg-secondary/20 transition-all overflow-hidden"
                            >
                              <div className="flex gap-0">
                                {/* Visual preview */}
                                <div className="w-[130px] shrink-0 bg-muted/10 border-r border-border/20 p-1.5 flex items-center">
                                  <SectionPreview
                                    tree={deserializeTree(section.tree)}
                                    maxDepth={2}
                                    className="rounded-sm"
                                  />
                                </div>

                                {/* Info panel */}
                                <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                                  {/* Category badge + name */}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-xs">{catInfo?.icon || "📦"}</span>
                                      <span className="text-[0.4rem] font-mono uppercase text-muted-foreground/50">
                                        {section.category}
                                      </span>
                                      <span className="text-[0.35rem] text-muted-foreground/40 flex items-center gap-0.5">
                                        <Eye className="h-2 w-2" /> {section.componentCount}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-medium truncate">{section.name}</h4>
                                    <p className="text-[0.45rem] text-muted-foreground/70 mt-0.5 line-clamp-2 leading-relaxed">
                                      {section.description}
                                    </p>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center justify-end gap-1.5 mt-1.5 pt-1.5 border-t border-border/20">
                                    <button
                                      onClick={() => handleAddFromMarketplace(section)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[0.4rem] font-medium border border-border/40 rounded-md hover:bg-secondary/40 transition-colors"
                                      title="Add to my saved sections"
                                    >
                                      <Bookmark className="h-2.5 w-2.5" /> Save
                                    </button>
                                    <button
                                      onClick={() => handleInsertMarketplace(section)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[0.4rem] font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
                                      title="Insert into page"
                                    >
                                      <Plus className="h-2.5 w-2.5" /> Insert
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* ── Saved Sections View (with folder sidebar) ────────── */
            <div className="flex gap-0 h-full">
              {/* Folder sidebar */}
              <div className="w-[190px] shrink-0 border-r border-border/40 flex flex-col bg-secondary/5">
                <div className="p-2.5 border-b border-border/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.45rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">Folders</span>
                    <button
                      onClick={() => { setShowNewFolderInput(true); setTimeout(() => newFolderInputRef.current?.focus(), 50); }}
                      className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-secondary/40 transition-colors"
                      title="New folder"
                    >
                      <FolderPlus className="h-3 w-3" />
                    </button>
                  </div>
                  {showNewFolderInput && (
                    <div className="flex items-center gap-1">
                      <input
                        ref={newFolderInputRef}
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolderInput(false); }}
                        onBlur={() => { if (newFolderName.trim()) handleCreateFolder(); else setShowNewFolderInput(false); }}
                        placeholder="Folder name…"
                        className="flex-1 px-1.5 py-1 text-[0.45rem] border border-border/40 rounded bg-background focus:outline-none focus:border-foreground/40"
                      />
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                  {/* All sections */}
                  <button
                    onClick={() => setSelectedFolderId(null)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                      selectedFolderId === null
                        ? "bg-foreground/10 text-foreground font-medium"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Folder className="h-3 w-3 shrink-0" />
                    <span className="text-[0.45rem] truncate">All Sections</span>
                    <span className="ml-auto text-[0.35rem] text-muted-foreground/40">{sections.length}</span>
                  </button>

                  {/* Uncategorized */}
                  <button
                    onClick={() => setSelectedFolderId("__uncategorized__")}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                      selectedFolderId === "__uncategorized__"
                        ? "bg-foreground/10 text-foreground font-medium"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="text-[0.45rem] truncate">Uncategorized</span>
                    <span className="ml-auto text-[0.35rem] text-muted-foreground/40">{getUncategorizedSections(sections).length}</span>
                  </button>

                  {/* Divider */}
                  <div className="my-1 border-t border-border/20" />

                  {/* Folder list */}
                  {folders.map((folder) => {
                    const count = folderCounts.get(folder.id) ?? 0;
                    return (
                      <div key={folder.id} className="group/folder">
                        {editingFolderId === folder.id ? (
                          <div className="flex items-center gap-1 px-2 py-1">
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleFinishRenameFolder(); if (e.key === "Escape") setEditingFolderId(null); }}
                              onBlur={handleFinishRenameFolder}
                              autoFocus
                              className="flex-1 px-1.5 py-0.5 text-[0.45rem] border border-border/40 rounded bg-background focus:outline-none focus:border-foreground/40"
                            />
                            <button onClick={handleFinishRenameFolder} className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground">
                              <Check className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedFolderId(folder.id)}
                            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors group ${
                              selectedFolderId === folder.id
                                ? "bg-foreground/10 text-foreground font-medium"
                                : "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40"
                            }`}
                          >
                            <Folder className="h-3 w-3 shrink-0" />
                            <span className="text-[0.45rem] truncate flex-1">{folder.name}</span>
                            <span className="text-[0.35rem] text-muted-foreground/40">{count}</span>
                            <div className="hidden group-hover/folder:flex items-center gap-0.5 ml-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStartRenameFolder(folder); }}
                                className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground"
                                title="Rename"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                                className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive"
                                title="Delete folder"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {folders.length === 0 && (
                    <p className="text-[0.4rem] text-muted-foreground/40 text-center py-3">
                      No folders yet. Click + to create one.
                    </p>
                  )}
                </div>
              </div>

              {/* Section grid */}
              <div className="flex-1 min-w-0 overflow-y-auto p-4">
                {sectionsInView.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Globe className="h-8 w-8 mb-3 opacity-30" />
                    {search ? (
                      <p className="text-xs">No sections matching "{search}"</p>
                    ) : selectedFolderId === "__uncategorized__" ? (
                      <>
                        <p className="text-sm font-medium mb-1">No uncategorized sections</p>
                        <p className="text-xs opacity-70">All your sections are organized into folders.</p>
                      </>
                    ) : selectedFolderId ? (
                      <>
                        <p className="text-sm font-medium mb-1">This folder is empty</p>
                        <p className="text-xs opacity-70">Move sections here using the folder option on each card.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium mb-1">No saved sections yet</p>
                        <p className="text-xs opacity-70">
                          Select a component on your page and click "Save Current" to add it here, or browse the{" "}
                          <button onClick={() => setActiveTab("marketplace")} className="underline hover:text-foreground transition-colors">Marketplace</button>
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {sectionsInView.map((section) => {
                      const currentFolderId = getSectionFolderId(section.id);
                      return (
                        <div
                          key={section.id}
                          className="group relative border border-border/40 rounded-xl p-3 hover:border-foreground/30 hover:bg-secondary/20 transition-all"
                        >
                          {/* Section type badge */}
                          <div className="flex items-center gap-1.5 mb-2">
                            {section.isGlobal ? (
                              <Globe className="h-3 w-3 text-primary/60" />
                            ) : (
                              <FileText className="h-3 w-3 text-muted-foreground/60" />
                            )}
                            <span className="text-[0.45rem] font-mono uppercase text-muted-foreground/50">
                              {section.type}
                            </span>
                            {section.isGlobal && (
                              <span className="text-[0.4rem] font-medium text-primary/60 bg-primary/5 px-1 py-0.5 rounded">
                                Global
                              </span>
                            )}
                          </div>

                          {/* Name + description */}
                          <h4 className="text-xs font-medium truncate">{section.name}</h4>
                          {section.description && (
                            <p className="text-[0.5rem] text-muted-foreground/70 mt-0.5 line-clamp-2">
                              {section.description}
                            </p>
                          )}

                          {/* Folder badge */}
                          {currentFolderId && (
                            <div className="flex items-center gap-1 mt-1">
                              <Folder className="h-2.5 w-2.5 text-muted-foreground/40" />
                              <span className="text-[0.35rem] text-muted-foreground/40 truncate">
                                {folders.find((f) => f.id === currentFolderId)?.name || "Unknown"}
                              </span>
                            </div>
                          )}

                          {/* Date + actions */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                            <span className="text-[0.4rem] text-muted-foreground/40">
                              {new Date(section.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Folder move dropdown */}
                              <select
                                value={currentFolderId || ""}
                                onChange={(e) => handleMoveSectionToFolder(section.id, e.target.value || null)}
                                className="px-1 py-0.5 text-[0.35rem] border border-border/30 rounded bg-background focus:outline-none focus:border-foreground/40 cursor-pointer"
                                title="Move to folder"
                              >
                                <option value="">No folder</option>
                                {folders.map((f) => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleInsert(section.id)}
                                className="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors"
                                title="Insert into page"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleExport(section.id, section.name)}
                                className="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors"
                                title="Export as JSON"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                              {section.isGlobal && (
                                <button
                                  onClick={() => {
                                    if (selectedTree) {
                                      updateSectionTree(section.id, selectedTree);
                                    }
                                  }}
                                  className="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors"
                                  title="Update global component"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(section.id, section.name)}
                                className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Import result toast */}
      {importResult && (          <div
            className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); setImportResult(null); }}
          >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold mb-3">
              {importResult.success ? "✅ Import Successful" : "⚠️ Import Issues"}
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              {importResult.count > 0
                ? `Imported ${importResult.count} section${importResult.count > 1 ? "s" : ""}.`
                : "No sections were imported."}
            </p>
            {importResult.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-[0.5rem] text-destructive/80 font-mono">
                    {err}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setImportResult(null)}
                className="px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/60 bg-secondary/10 shrink-0">
          {activeTab === "saved" ? (
            <p className="text-[0.45rem] text-muted-foreground/60 text-center">
              Saved sections are stored locally in this browser.{" "}
              {sections.filter((s) => s.isGlobal).length} global ·{" "}
              {sections.filter((s) => !s.isGlobal).length} reusable
            </p>
          ) : (
            <p className="text-[0.45rem] text-muted-foreground/60 text-center">
              {MARKETPLACE_SECTIONS.length} bundled sections across {MARKETPLACE_CATEGORIES.length} categories
            </p>
          )}
        </div>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold mb-4">Save as Section</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[0.5rem] font-medium text-muted-foreground mb-1 uppercase tracking-[0.05em]">
                  Name
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
                  placeholder="My Section"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[0.5rem] font-medium text-muted-foreground mb-1 uppercase tracking-[0.05em]">
                  Description (optional)
                </label>
                <textarea
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40 resize-none"
                  placeholder="What does this section do?"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGlobal}
                  onChange={(e) => setIsGlobal(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30"
                />
                <span className="text-xs font-medium">Global component</span>
                <span className="text-[0.5rem] text-muted-foreground/60">
                  (updates sync across all pages)
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border/40">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="h-3 w-3" /> Save Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
