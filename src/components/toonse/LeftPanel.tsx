import {
  Bone,
  ChevronRight,
  Folder,
  ImagePlus,
  Layers,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";
import { useRef, useState } from "react";
import { useEngine } from "./useEngine";

function RenameableLayerName({
  name,
  onRename,
}: {
  name: string;
  onRename: (newName: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);

  if (isEditing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          onRename(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setIsEditing(false);
            onRename(value);
          } else if (e.key === "Escape") {
            setIsEditing(false);
            setValue(name);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="toonse-layerName"
        style={{
          background: "transparent",
          border: "1px solid var(--toonse-muted)",
          color: "inherit",
          outline: "none",
        }}
      />
    );
  }
  return (
    <span
      className="toonse-layerName"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {name}
    </span>
  );
}

export function LeftPanel({ isOpen }: { isOpen: boolean }) {
  const engine = useEngine();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const objects = Object.values(engine.objects).sort((a, b) => b.zIndex - a.zIndex);
  const groupedObjectIds = new Set(engine.rigGroups.flatMap((group) => group.memberIds));
  const looseObjects = objects.filter((obj) => !groupedObjectIds.has(obj.id));

  return (
    <aside className="toonse-leftPanel">
      <div className="toonse-panelHeader">
        <span>
          <Layers size={14} /> Layers
        </span>
        <button
          type="button"
          onClick={() => engine.addLayer()}
          title="Add Layer"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="toonse-colorBlock">
        <label>
          Stroke / fill color
          <input
            type="color"
            value={engine.currentColor}
            onChange={(event) => engine.setCurrentColor(event.target.value)}
          />
        </label>
        <label>
          Canvas color
          <input
            type="color"
            value={engine.canvasColor}
            onChange={(event) => engine.setCanvasColor(event.target.value)}
          />
        </label>
        <div className="toonse-rowButtons">
          <button type="button" onClick={() => engine.applyFillToSelected()}>
            Apply fill
          </button>
          <button type="button" onClick={() => engine.clearFills()}>
            Clear fills
          </button>
        </div>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="image/png,image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void engine.importPng(file);
            event.currentTarget.value = "";
          }}
        />
        <button type="button" className="toonse-upload" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={15} /> Upload PNG
        </button>
      </div>

      <div className="toonse-layerList">
        {engine.rigGroups.map((group) => (
          <div key={group.id} className="toonse-groupBlock">
            <div
              className={`toonse-group ${engine.selectedGroupId === group.id ? "is-selected" : ""}`}
              onClick={() => engine.selectGroup(group.id)}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  engine.toggleGroupExpanded(group.id);
                }}
                title="Expand group"
                aria-label="Expand group"
              >
                <ChevronRight size={14} className={group.expanded ? "rotate-90" : ""} />
              </button>
              <Folder size={14} />
              <RenameableLayerName
                name={group.name}
                onRename={(name) => {
                  group.name = name;
                  engine.notify();
                }}
              />
              <small>{group.memberIds.length} parts</small>
            </div>
            {group.expanded && (
              <div className="toonse-groupChildren">
                {group.boneIds.map((boneId) => {
                  const bone = engine.bones.find((item) => item.id === boneId);
                  if (!bone) return null;
                  return (
                    <div
                      key={bone.id}
                      className={`toonse-layer toonse-boneLayer ${engine.selectedBoneId === bone.id ? "is-selected" : ""}`}
                      onClick={() => engine.selectBone(bone.id)}
                    >
                      <Bone size={14} />
                      <RenameableLayerName
                        name={bone.name}
                        onRename={(name) => {
                          bone.name = name;
                          engine.notify();
                        }}
                      />
                      <small>{Math.round(bone.lockedDistance)}px</small>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          engine.deleteBone(bone.id);
                        }}
                        title="Delete bone"
                        aria-label="Delete bone"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                {group.memberIds.map((memberId) => {
                  const obj = engine.objects[memberId];
                  if (!obj) return null;
                  return (
                    <div
                      key={obj.id}
                      className={`toonse-layer ${engine.selectedId === obj.id ? "is-selected" : ""}`}
                      onClick={() => engine.selectObject(obj.id, true)}
                    >
                      <span
                        className="toonse-swatch"
                        style={{ backgroundColor: obj.fillColor ?? obj.color }}
                      />
                      <RenameableLayerName
                        name={obj.name}
                        onRename={(name) => engine.renameObject(obj.id, name)}
                      />
                      <small>Z {obj.zIndex}</small>
                      <select
                        value={obj.layerId}
                        onChange={(e) => {
                          e.stopPropagation();
                          engine.moveObjectToLayer(obj.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Move to layer"
                        className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded ml-2"
                      >
                        {engine.layers.map((l) => (
                          <option
                            key={l.id}
                            value={l.id}
                            className="text-gray-900 bg-white dark:text-white dark:bg-gray-800"
                          >
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.moveLayerUp(obj.id);
                        }}
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.moveLayerDown(obj.id);
                        }}
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.toggleVisibility(obj.id);
                        }}
                        title="Toggle visibility"
                      >
                        {obj.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.toggleLock(obj.id);
                        }}
                        title="Toggle lock"
                      >
                        {obj.locked === true ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          engine.deleteObject(obj.id);
                        }}
                        title="Delete"
                        aria-label="Delete drawing"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {engine.layers.map((layer) => {
          const layerObjects = looseObjects.filter((o) => o.layerId === layer.id);

          return (
            <div key={layer.id} className="toonse-groupBlock">
              <div
                className={`toonse-group ${engine.activeLayerId === layer.id ? "is-selected" : ""}`}
                onClick={() => engine.setActiveLayer(layer.id)}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    engine.toggleLayerExpanded(layer.id);
                  }}
                  title="Expand layer"
                  aria-label="Expand layer"
                >
                  <ChevronRight size={14} className={layer.expanded ? "rotate-90" : ""} />
                </button>
                <Layers size={14} />
                <RenameableLayerName
                  name={layer.name}
                  onRename={(name) => engine.renameLayer(layer.id, name)}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    engine.moveLayerUp(layer.id);
                  }}
                  title="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    engine.moveLayerDown(layer.id);
                  }}
                  title="Move down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    engine.toggleLayerVisibility(layer.id);
                  }}
                  title="Toggle visibility"
                >
                  {layer.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    engine.toggleLayerLock(layer.id);
                  }}
                  title="Toggle lock"
                >
                  {layer.locked === true ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    engine.deleteLayer(layer.id);
                  }}
                  title="Delete layer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {layer.expanded && (
                <div className="toonse-groupChildren">
                  {layerObjects.map((obj) => (
                    <div
                      key={obj.id}
                      className={`toonse-layer ${engine.selectedId === obj.id ? "is-selected" : ""}`}
                      onClick={() => engine.selectObject(obj.id, true)}
                    >
                      <span
                        className="toonse-swatch"
                        style={{ backgroundColor: obj.fillColor ?? obj.color }}
                      />
                      <RenameableLayerName
                        name={obj.name}
                        onRename={(name) => engine.renameObject(obj.id, name)}
                      />
                      <small>Z {obj.zIndex}</small>
                      <select
                        value={obj.layerId}
                        onChange={(e) => {
                          e.stopPropagation();
                          engine.moveObjectToLayer(obj.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Move to layer"
                        className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded ml-2"
                      >
                        {engine.layers.map((l) => (
                          <option
                            key={l.id}
                            value={l.id}
                            className="text-gray-900 bg-white dark:text-white dark:bg-gray-800"
                          >
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.moveLayerUp(obj.id);
                        }}
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.moveLayerDown(obj.id);
                        }}
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.toggleVisibility(obj.id);
                        }}
                        title="Toggle visibility"
                      >
                        {obj.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.toggleLock(obj.id);
                        }}
                        title="Toggle lock"
                      >
                        {obj.locked === true ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          engine.deleteObject(obj.id);
                        }}
                        title="Delete"
                        aria-label="Delete drawing"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!objects.length && (
          <p className="toonse-empty">Draw on the canvas to create a selected drawing.</p>
        )}
      </div>
    </aside>
  );
}
