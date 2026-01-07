"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Position,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { Topic, Entry } from "@/lib/types";
import { useRouter } from "next/navigation";
import { DetailPanel } from "./DetailPanel";
import { analyzeTopicContentAction } from "@/app/actions";

// --- Layout Utilities (Dagre) ---

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 180;
const nodeHeight = 50;

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "LR"
) => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Dynamic height adjustment could go here based on content
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // If node is not connected or isolated, dagre might return undefined?
    // Usually dagre handles all nodes added to graph.
    if (!nodeWithPosition) return node;

    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // Shift positions to center
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes: layoutedNodes, edges };
};

// --- Component ---

type Props = {
  topics: Topic[];
  entries: Entry[];
};

export function TopicGraph({ topics, entries }: Props) {
  const router = useRouter();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedTopicIds, setCollapsedTopicIds] = useState<Set<string>>(
    new Set()
  );

  // Grouping Mode: 'none' | 'date' | 'ai'
  const [groupingMode, setGroupingMode] = useState<"none" | "date" | "ai">(
    "none"
  );

  // AI Groups Cache: { topicId: { "ClusterName": [entryId, entryId] } }
  const [aiGroupsCache, setAiGroupsCache] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper: Find data for selected node
  const selectedData = useMemo(() => {
    if (!selectedNodeId) return null;
    if (selectedNodeId.startsWith("topic-")) {
      const tid = selectedNodeId.replace("topic-", "");
      return {
        type: "topic" as const,
        data: topics.find((t) => t.id === tid) || null,
      };
    }
    if (selectedNodeId.startsWith("entry-")) {
      const eid = selectedNodeId.replace("entry-", "");
      return {
        type: "entry" as const,
        data: entries.find((e) => e.id === eid) || null,
      };
    }
    if (selectedNodeId === "root") {
      return { type: "root" as const, data: null };
    }
    return null;
  }, [selectedNodeId, topics, entries]);

  // Effect: Trigger AI Analysis when mode enabled and cache missing
  useEffect(() => {
    if (groupingMode !== "ai") return;

    const analyzeMissingTopics = async () => {
      setIsAnalyzing(true);
      // Find topics that are visible, grouped by AI, and NOT in cache
      // Simplicity: Analyze ALL topics that have entries if not cached
      // Ideally we only analyze collapsed=false topics, but for now analyze all for smoothness

      for (const topic of topics) {
        if (aiGroupsCache[topic.id]) continue; // Already cached

        const topicEntries = entries.filter((e) =>
          e.topic_ids?.includes(topic.id)
        );
        if (topicEntries.length < 3) continue; // Skip small clusters

        // Prepare mini entries for AI
        const miniEntries = topicEntries.map((e) => ({
          id: e.id,
          title: e.title || "No Title",
          human_view: e.human_view || "",
        }));

        const res = await analyzeTopicContentAction(topic.name, miniEntries);
        if (res.success && res.data?.groups) {
          setAiGroupsCache((prev) => ({
            ...prev,
            [topic.id]: res.data.groups,
          }));
        }
      }
      setIsAnalyzing(false);
    };

    analyzeMissingTopics();
  }, [groupingMode, topics, entries, aiGroupsCache]);

  // Re-calculate Graph Data when data or collapse state changes
  const { nodes: checkNodes, edges: checkEdges } = useMemo(() => {
    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];

    // ROOT Node
    rawNodes.push({
      id: "root",
      type: "input",
      data: { label: "Journal 🧠" },
      position: { x: 0, y: 0 },
      style: {
        background: "#fff",
        color: "#1c1c1e",
        border: "2px solid #000",
        fontWeight: "bold",
        borderRadius: "8px",
        width: 150,
        textAlign: "center",
      },
    });

    // TOPIC Nodes
    topics.forEach((topic) => {
      const isCollapsed = collapsedTopicIds.has(topic.id);
      const hasEntries = entries.some((e) => e.topic_ids?.includes(topic.id));

      rawNodes.push({
        id: `topic-${topic.id}`,
        data: {
          label: `${topic.name} ${
            hasEntries ? (isCollapsed ? "➕" : "➖") : ""
          }`,
        },
        position: { x: 0, y: 0 },
        style: {
          background: "var(--color-bg-tertiary)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-accent-primary)",
          borderRadius: "20px",
          padding: "10px",
          width: 160,
          textAlign: "center",
          cursor: "pointer",
        },
      });

      // Link Root -> Topic
      rawEdges.push({
        id: `e-root-${topic.id}`,
        source: "root",
        target: `topic-${topic.id}`,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#666" },
      });

      // --- GROUPING LOGIC ---

      if (!isCollapsed && hasEntries) {
        const topicEntries = entries.filter((e) =>
          e.topic_ids?.includes(topic.id)
        );

        const groups: Record<string, Entry[]> = {};
        const groupedEntryIds = new Set<string>();

        // Strategy: Populate 'groups' based on mode
        if (groupingMode === "date") {
          topicEntries.forEach((e) => {
            const date = new Date(e.created_at);
            const key = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(e);
            groupedEntryIds.add(e.id);
          });
        } else if (groupingMode === "ai") {
          // Check cache
          const cachedGroups = aiGroupsCache[topic.id];
          if (cachedGroups) {
            Object.entries(cachedGroups).forEach(([themeName, entryIds]) => {
              // Map entry IDs back to full Entry objects
              const associatedEntries = topicEntries.filter((e) =>
                entryIds.includes(e.id)
              );
              if (associatedEntries.length > 0) {
                groups[themeName] = associatedEntries;
                associatedEntries.forEach((e) => groupedEntryIds.add(e.id));
              }
            });
          }
          // If not cached yet or some entries not grouped, we handle them below (fallback to flat)
        }

        // RENDER GROUPS (Nodes & Edges)
        Object.entries(groups).forEach(([groupName, groupEntries]) => {
          const groupId = `group-${topic.id}-${groupName}`;

          // Group Node
          rawNodes.push({
            id: groupId,
            data: {
              label:
                groupingMode === "ai" ? `🤖 ${groupName}` : `📅 ${groupName}`,
            },
            position: { x: 0, y: 0 },
            style: {
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-secondary)",
              border:
                groupingMode === "ai"
                  ? "1px dashed var(--color-accent-secondary)"
                  : "1px dashed var(--color-border)",
              borderRadius: "12px",
              padding: "5px",
              width: 140,
              fontSize: "0.85rem",
              textAlign: "center",
            },
          });

          // Link Topic -> Group
          rawEdges.push({
            id: `e-${topic.id}-${groupId}`,
            source: `topic-${topic.id}`,
            target: groupId,
            type: "default",
            style: { stroke: "#ccc", strokeDasharray: "5,5" },
          });

          // Link Group -> Entries
          groupEntries.forEach((entry) => {
            const uniqueEntryId = `entry-${entry.id}-under-${topic.id}-grp-${groupName}`; // Unique ID
            rawNodes.push({
              id: uniqueEntryId,
              data: { label: entry.title || "Untitled" },
              position: { x: 0, y: 0 },
              style: {
                background: "var(--color-bg-primary)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "4px",
                padding: "5px 10px",
                fontSize: "0.8rem",
                width: 180,
              },
            });

            rawEdges.push({
              id: `e-${groupId}-${uniqueEntryId}`,
              source: groupId,
              target: uniqueEntryId,
              type: "smoothstep",
              style: { stroke: "#999", opacity: 0.5 },
            });
          });
        });

        // RENDER REMAINING ENTRIES (Flat)
        // For 'none' mode (all entries) OR entries that weren't grouped by AI
        const remainingEntries = topicEntries.filter(
          (e) => !groupedEntryIds.has(e.id)
        );

        remainingEntries.forEach((entry) => {
          const uniqueEntryId = `entry-${entry.id}-under-${topic.id}-flat`;
          rawNodes.push({
            id: uniqueEntryId,
            data: { label: entry.title || "Untitled" },
            position: { x: 0, y: 0 },
            style: {
              background: "var(--color-bg-primary)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              padding: "5px 10px",
              fontSize: "0.8rem",
              width: 180,
            },
          });

          // Link Topic -> Entry
          rawEdges.push({
            id: `e-${topic.id}-${uniqueEntryId}`,
            source: `topic-${topic.id}`,
            target: uniqueEntryId,
            type: "smoothstep",
            style: { stroke: "#999", opacity: 0.5 },
          });
        });
      }
    });

    return getLayoutedElements(rawNodes, rawEdges);
  }, [topics, entries, collapsedTopicIds, groupingMode, aiGroupsCache]);

  const [nodes, setNodes, onNodesChange] = useNodesState(checkNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(checkEdges);

  // Update layout when calculation changes
  useEffect(() => {
    setNodes(checkNodes);
    setEdges(checkEdges);
  }, [checkNodes, checkEdges, setNodes, setEdges]);

  // Click -> Select Node
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Handle the unique entry IDs we created (with prefix/suffix)
    if (node.id.startsWith("entry-")) {
      // Simple regex/parsing to extract UUID?
      // ID format: entry-UUID-under...
      const parts = node.id.split("-under-");
      if (parts.length > 0) {
        const originalId = parts[0].replace("entry-", "");
        setSelectedNodeId(`entry-${originalId}`);
        return;
      }
    }
    setSelectedNodeId(node.id);
  }, []);

  // Double Click -> Toggle Collapse (Only for Topics)
  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("topic-")) {
        const tid = node.id.replace("topic-", "");
        setCollapsedTopicIds((prev) => {
          const next = new Set(prev);
          if (next.has(tid)) next.delete(tid);
          else next.add(tid);
          return next;
        });
      }
    },
    []
  );

  // Close Panel
  const handleClosePanel = () => setSelectedNodeId(null);

  return (
    <div
      style={{
        width: "100%",
        height: "100%", // Fit parent
        background: "var(--color-bg-secondary)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          zIndex: 5,
          background: "var(--color-bg-tertiary)",
          padding: "0.5rem",
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Map Type:</span>
        <button
          onClick={() => setGroupingMode("none")}
          style={{
            background:
              groupingMode === "none"
                ? "var(--color-accent-primary)"
                : "transparent",
            color:
              groupingMode === "none" ? "#fff" : "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          Flat
        </button>
        <button
          onClick={() => setGroupingMode("date")}
          style={{
            background:
              groupingMode === "date"
                ? "var(--color-accent-primary)"
                : "transparent",
            color:
              groupingMode === "date" ? "#fff" : "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          ✨ Date
        </button>
        <button
          onClick={() => setGroupingMode("ai")}
          disabled={isAnalyzing}
          style={{
            background:
              groupingMode === "ai"
                ? "var(--color-accent-secondary)" // Use green/secondary for AI
                : "transparent",
            color:
              groupingMode === "ai" ? "#000" : "var(--color-text-secondary)", // maybe dark text for light green
            border: "1px solid var(--color-border)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          🔮 AI {isAnalyzing && "..."}
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      >
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.id.startsWith("topic")) return "var(--color-accent-primary)";
            if (n.id === "root") return "#000";
            return "#ccc";
          }}
          nodeColor={(n) => {
            if (n.id.startsWith("topic")) return "var(--color-bg-tertiary)";
            return "#fff";
          }}
        />
        <Background color="#aaa" gap={16} />
      </ReactFlow>

      {/* Detail Panel Overlay */}
      {selectedData && (
        <DetailPanel
          nodeId={selectedNodeId}
          nodeType={selectedData.type}
          data={selectedData.data}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
