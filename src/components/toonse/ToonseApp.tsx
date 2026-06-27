import {
  Download,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  Sun,
  Save,
  FolderOpen,
  LogOut,
  Loader2,
  Undo2,
  Redo2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { CanvasArea } from "./CanvasArea";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { Timeline } from "./Timeline";
import { Toolbar } from "./Toolbar";
import { useEngine } from "./useEngine";
import { Engine } from "./engine";

function serializeEngineState(engine: Engine) {
  return JSON.stringify(engine.getStateData());
}

function restoreEngineState(engine: Engine, dataStr: string) {
  // Try to use the engine's built-in state applier since it properly loads images
  // We'll wrap it by restoring the history so it sets it as the first state
  const tempHistory = [...engine.history];
  const tempIndex = engine.historyIndex;
  
  engine.history = [];
  engine.historyIndex = -1;
  engine.saveState(); // create empty base
  
  // Actually load the project
  // We can just call engine['applyState'] (it's private but this is JS) or add a public method.
  // I'll modify ToonseApp to just parse it here to avoid TS errors.
  try {
    const data = JSON.parse(dataStr);
    engine.objects = data.objects || {};
    
    // Recreate image elements
    for (const obj of Object.values(engine.objects)) {
      if (obj.kind === "image" && obj.imageSrc) {
        const img = new Image();
        img.onload = () => engine.render();
        img.src = obj.imageSrc;
        obj.imageElement = img;
      }
    }
    
    engine.frames = data.frames || [{ id: "f1", transforms: {} }];
    engine.bones = data.bones || [];
    engine.rigGroups = data.rigGroups || [];
    engine.layers = data.layers || [];
    engine.meshShowPoints = data.meshShowPoints ?? false;
    engine.meshShowGrid = data.meshShowGrid ?? false;
    engine.onionSkin = data.onionSkin ?? false;
    engine.currentFrameIdx = 0;
    engine.selectedId = null;
    engine.selectedBoneId = null;
    engine.selectedGroupId = null;
    if (engine.layers.length > 0) {
      engine.activeLayerId = engine.layers[engine.layers.length - 1].id;
    } else {
      engine.ensureActiveLayer();
    }
    
    // Reset history with this loaded state as base
    engine.history = [dataStr];
    engine.historyIndex = 0;
    
    engine.notify();
    engine.render();
  } catch (err) {
    console.error("Failed to restore project", err);
    engine.history = tempHistory;
    engine.historyIndex = tempIndex;
  }
}

export function ToonseApp() {
  const engine = useEngine();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [light, setLight] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState("");

  // Projects state
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; date: string }[]>([]);
  const [currentProjectName, setCurrentProjectName] = useState("Untitled Project");

  useEffect(() => {
    const savedUser = localStorage.getItem("toonse_user");
    if (savedUser) {
      setUserEmail(savedUser);
      setShowAuth(false);

      // Auto-load last autosave for this user
      const autoSave = localStorage.getItem(`toonse_autosave_${savedUser}`);
      if (autoSave) {
        try {
          const { data, name } = JSON.parse(autoSave);
          restoreEngineState(engine, data);
          if (name) setCurrentProjectName(name);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [engine]);

  useEffect(() => {
    if (userEmail && !showAuth) {
      const data = serializeEngineState(engine);
      localStorage.setItem(
        `toonse_autosave_${userEmail}`,
        JSON.stringify({ data, name: currentProjectName }),
      );
    }
  }); // Run on every render (which happens when engine notifies)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.includes("@gmail.com")) {
      setAuthError("Please use a @gmail.com address for this simple demo.");
      return;
    }
    if (authPass.length < 4) {
      setAuthError("Password too short.");
      return;
    }
    localStorage.setItem("toonse_user", authEmail);
    setUserEmail(authEmail);
    setShowAuth(false);
    setAuthError("");

    // Auto-load last autosave for this user
    const autoSave = localStorage.getItem(`toonse_autosave_${authEmail}`);
    if (autoSave) {
      try {
        const { data, name } = JSON.parse(autoSave);
        restoreEngineState(engine, data);
        if (name) setCurrentProjectName(name);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("toonse_user");
    setUserEmail(null);
    setShowAuth(true);
  };

  const loadProjects = () => {
    if (!userEmail) return;
    const stored = localStorage.getItem(`toonse_projects_${userEmail}`);
    if (stored) {
      setProjects(JSON.parse(stored));
    } else {
      setProjects([]);
    }
  };

  const handleSave = () => {
    if (!userEmail) return;
    const data = serializeEngineState(engine);
    const projectId = Date.now().toString();
    const newProjectInfo = {
      id: projectId,
      name: currentProjectName,
      date: new Date().toLocaleString(),
    };

    const stored = localStorage.getItem(`toonse_projects_${userEmail}`);
    const projs = stored ? JSON.parse(stored) : [];

    // Check if we are updating existing by name (simple logic)
    const existingIdx = projs.findIndex(
      (p: { id: string; name: string; date: string }) => p.name === currentProjectName,
    );
    if (existingIdx >= 0) {
      projs[existingIdx].date = newProjectInfo.date;
      localStorage.setItem(`toonse_data_${projs[existingIdx].id}`, data);
    } else {
      projs.push(newProjectInfo);
      localStorage.setItem(`toonse_data_${projectId}`, data);
    }

    localStorage.setItem(`toonse_projects_${userEmail}`, JSON.stringify(projs));
    alert("Project saved successfully!");
  };

  const handleLoadProject = (id: string, name: string) => {
    const data = localStorage.getItem(`toonse_data_${id}`);
    if (data) {
      restoreEngineState(engine, data);
      setCurrentProjectName(name);
      setShowProjects(false);
    }
  };

  const exportVideo = async () => {
    if (!engine.canvas) return;
    setExporting(true);
    const originalFrame = engine.currentFrameIdx;
    const wasPlaying = engine.isPlaying;
    if (wasPlaying) engine.togglePlay();
    try {
      const stream = engine.canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${currentProjectName}.webm`;
        link.click();
        URL.revokeObjectURL(url);
        engine.currentFrameIdx = originalFrame;
        engine.render();
        engine.notify();
        setExporting(false);
      };
      recorder.start();
      let frame = 0;
      const tick = () => {
        engine.currentFrameIdx = frame;
        engine.render();
        frame++;
        if (frame < engine.frames.length) {
          setTimeout(tick, 1000 / 12);
        } else {
          setTimeout(() => recorder.stop(), 1000 / 12);
        }
      };
      tick();
    } catch {
      setExporting(false);
    }
  };

  if (showAuth) {
    return (
      <div
        className={`toonse-app ${light ? "toonse-light" : ""} flex items-center justify-center min-h-screen p-4`}
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Toonse Studio</h1>
            <p className="text-gray-500 dark:text-gray-400">Sign in to sync your drawings</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
                {authError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email (Gmail)
              </label>
              <input
                type="email"
                required
                placeholder="name@gmail.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-4"
            >
              Enter Studio
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className={`toonse-app ${light ? "toonse-light" : ""}`}>
      {showProjects && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Your Saved Projects
              </h2>
              <button
                onClick={() => setShowProjects(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FolderOpen className="mx-auto h-12 w-12 mb-3 opacity-20" />
                  <p>No projects saved yet.</p>
                </div>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{p.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last saved: {p.date}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLoadProject(p.id, p.name)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Open
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <header className="toonse-header">
        <div className="toonse-headGroup">
          <h1>
            PRO-DRAW <span>v1.1 Rig</span>
          </h1>
          <button
            type="button"
            onClick={() => setLeftOpen((open) => !open)}
            aria-label="Toggle left panel"
          >
            <PanelLeftClose size={18} className={leftOpen ? "" : "rotate-180"} />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2"></div>

          <input
            type="text"
            value={currentProjectName}
            onChange={(e) => setCurrentProjectName(e.target.value)}
            className="bg-transparent border-none outline-none font-medium text-sm w-32 focus:ring-2 focus:ring-blue-500/50 rounded px-1"
          />

          <button
            type="button"
            onClick={() => engine.undo()}
            disabled={engine.historyIndex <= 0}
            title="Undo"
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Undo2 size={16} />
          </button>
          
          <button
            type="button"
            onClick={() => engine.redo()}
            disabled={engine.historyIndex >= engine.history.length - 1}
            title="Redo"
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Redo2 size={16} />
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

          <button
            type="button"
            onClick={handleSave}
            title="Save Project"
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            <Save size={16} /> <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={() => {
              loadProjects();
              setShowProjects(true);
            }}
            title="Open Project"
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            <FolderOpen size={16} /> <span className="hidden sm:inline">Open</span>
          </button>
        </div>
        <div className="toonse-headGroup">
          <div className="text-xs text-gray-500 hidden md:block mr-2">{userEmail}</div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 hover:bg-red-50 text-red-500 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            <LogOut size={16} />
          </button>

          <button
            type="button"
            className="toonse-export"
            onClick={exportVideo}
            disabled={exporting}
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exporting ? "Exporting" : "Export"}
          </button>
          <button
            type="button"
            onClick={() => setLight((value) => !value)}
            aria-label="Toggle theme"
          >
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setRightOpen((open) => !open)}
            aria-label="Toggle right panel"
          >
            <PanelRightClose size={18} className={rightOpen ? "" : "rotate-180"} />
          </button>
        </div>
      </header>

      <section className="toonse-workspace">
        <Toolbar />
        <LeftPanel isOpen={leftOpen} />
        <CanvasArea />
        <RightPanel isOpen={rightOpen} />
      </section>
      <Timeline />
    </main>
  );
}
