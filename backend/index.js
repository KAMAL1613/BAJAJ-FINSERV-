const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

/* ================= API ROUTE FIRST ================= */
app.post("/bfhl", (req, res) => {
  const { data } = req.body;

  const validEdges = [];
  const invalidEntries = [];
  const duplicateEdges = [];
  const seen = new Set();

  data.forEach(str => {
    const clean = str.trim();

    if (!/^[A-Z]->[A-Z]$/.test(clean) || clean[0] === clean[3]) {
      invalidEntries.push(clean);
      return;
    }

    if (seen.has(clean)) {
      if (!duplicateEdges.includes(clean)) duplicateEdges.push(clean);
      return;
    }

    seen.add(clean);
    validEdges.push(clean);
  });

  const graph = {};
  const childSet = new Set();
  const parentMap = {};

  validEdges.forEach(edge => {
    const [parent, child] = edge.split("->");

    if (parentMap[child]) return;

    parentMap[child] = parent;

    if (!graph[parent]) graph[parent] = [];
    graph[parent].push(child);

    childSet.add(child);
  });

  const nodes = new Set([...Object.keys(graph), ...childSet]);
  const roots = [...nodes].filter(n => !childSet.has(n));

  if (roots.length === 0 && nodes.size > 0) {
    const sortedNodes = [...nodes].sort();
    roots.push(sortedNodes[0]);
  }

  function buildTree(node, path) {
    if (path.has(node)) return { cycle: true };

    path.add(node);
    const children = graph[node] || [];
    let subtree = {};
    let maxDepth = 1;

    for (let child of children) {
      const res = buildTree(child, new Set(path));
      if (res.cycle) return { cycle: true };

      subtree[child] = res.tree;
      maxDepth = Math.max(maxDepth, 1 + res.depth);
    }

    return { tree: subtree, depth: maxDepth };
  }

  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let maxDepth = 0;
  let largestRoot = "";

  roots.forEach(root => {
    const res = buildTree(root, new Set());

    if (res.cycle) {
      totalCycles++;
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true
      });
    } else {
      totalTrees++;
      hierarchies.push({
        root,
        tree: { [root]: res.tree },
        depth: res.depth
      });

      if (res.depth > maxDepth || (res.depth === maxDepth && root < largestRoot)) {
        maxDepth = res.depth;
        largestRoot = root;
      }
    }
  });

  res.json({
    user_id: "yourname_ddmmyyyy",
    email_id: "your_email",
    college_roll_number: "your_roll",
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestRoot
    }
  });
});

/* ================= SERVE FRONTEND ================= */
app.use(express.static(path.join(__dirname, "../frontend")));

/* ================= FALLBACK ================= */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* ================= PORT FIX ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));