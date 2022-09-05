const fs = require("fs");
const path = require("path");

class Node {
  constructor(obj) {
    this.html_url = obj.html_url;
    this.type = Node.getType(this.html_url);
    this.number = obj.number;
    this.title = obj.title;
    this.user = obj.user;
    this.assignees = obj.assignees;
    this.body = obj.body; // string | null
    this.childrenCount = null;
    this.createdAt = obj.created_at;
    this.updatedAt = obj.updated_at;

    const lines = Node.splitByNewLine(this.body);
    this.parentRefs = Node.getParentRefs(lines, this.html_url);
    this.childrenRefs = Node.getChildrenRefs(lines, this.html_url);
  }

  addUndirectedRef(child) {
    this.addChildRef(child);
    child.addParentRef(this);
  }

  addChildRef(child) {
    this.childrenRefs.add(child.html_url);
    child.childrenRefs.delete(this.html_url);
  }

  addParentRef(parent) {
    this.parentRefs.add(parent.html_url);
    parent.parentRefs.delete(this.html_url);
  }

  static splitByNewLine(body) {
    return body ? body.split("\r\n").filter(Boolean) : [];
  }

  static getType(html_url) {
    if (/\/pull\//.test(html_url)) {
      return "pull";
    }

    if (/\/issues\//.test(html_url)) {
      return "issue";
    }
  }

  static getParentRefs(lines, own_ref) {
    const set = new Set();

    for (const line of lines) {
      if (
        /(related to|part of|fixes).*https:\/\/github.com\/busbud\/[a-z-]*\/(pull|issues)\/[0-9]*/gi.test(
          line
        )
      ) {
        const matches = line.match(
          /https:\/\/github.com\/busbud\/[a-z-]*\/(pull|issues)\/[0-9]*/gi
        );
        for (const match of matches) {
          set.add(match);
        }
      }
    }

    // don't reference itself
    set.delete(own_ref);

    return set;
  }

  static getChildrenRefs(lines, own_ref) {
    const set = new Set();

    for (const line of lines) {
      if (
        /\[[\w\s]\].*https:\/\/github.com\/busbud\/[a-z-]*\/(pull|issues)\/[0-9]*/gi.test(
          line
        )
      ) {
        const matches = line.match(
          /https:\/\/github.com\/busbud\/[a-z-]*\/(pull|issues)\/[0-9]*/gi
        );
        for (const match of matches) {
          set.add(match);
        }
      }
    }

    // don't reference itself
    set.delete(own_ref);

    return set;
  }
}

function getRepos() {
  const dirPath = path.join(__dirname, "../data");
  const repos = fs.readdirSync(dirPath);
  return repos;
}

function readDataFromDir(repo) {
  const dirPath = path.join(__dirname, `../data/${repo}`);
  const files = fs.readdirSync(dirPath);

  let arr = [];
  for (const file of files) {
    const json = fs.readFileSync(path.join(dirPath, file));
    const parsed = JSON.parse(json);
    arr = arr.concat(parsed);
  }

  return arr;
}

function cleanData(data) {
  return data.map(
    ({
      title,
      url,
      html_url,
      user,
      assignees,
      body,
      number,
      created_at,
      updated_at
    }) => {
      return {
        title,
        number,
        url,
        html_url,
        user: user.login,
        assignees: assignees.map((a) => a.login),
        body,
        created_at,
        updated_at
      };
    }
  );
}

function createNodes(data) {
  const nodesMap = new Map();

  for (const d of data) {
    const node = new Node(d);
    nodesMap.set(node.html_url, node);
  }

  return nodesMap;
}

function connectEdges(nodesMap) {
  for (const node of nodesMap.values()) {
    for (const childRef of node.childrenRefs.values()) {
      if (nodesMap.has(childRef)) {
        const child = nodesMap.get(childRef);
        node.addUndirectedRef(child);
      }
    }

    for (const parentRef of node.parentRefs.values()) {
      if (nodesMap.has(parentRef)) {
        const parent = nodesMap.get(parentRef);
        parent.addUndirectedRef(node);
      }
    }
  }

  return nodesMap;
}

function filterEntryPoints(refs, nodesMap, user) {
  const res = [];

  for (const ref of refs) {
    if (dfs(ref)) {
      res.push(ref);
    }
  }

  return res;

  function dfs(ref) {
    const node = nodesMap.get(ref);

    if (!node) return false;
    if (node.user === user) {
      return true;
    }

    for (const childRef of node.childrenRefs) {
      if (dfs(childRef)) {
        return true;
      }
    }

    return false;
  }
}

function stringifyReplacer(key, value) {
  if (value instanceof Set) {
    return Array.from(value);
  }

  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  return value;
}

function serialize(input) {
  return JSON.stringify(input, stringifyReplacer);
}

function getEntryPoints(nodesMap, repo) {
  const entryPoints = [];
  for (const node of nodesMap.values()) {
    // if parent node is in a different repo, keep the node for now
    const isParentInSameRepo = Array.from(node.parentRefs).some(
      (e) => e.indexOf(repo) > -1
    );

    if (node.parentRefs.size === 0 || !isParentInSameRepo) {
      entryPoints.push(node.html_url);
    }
  }

  return entryPoints;
}

function filterNodesMap(entryPoints, nodesMap) {
  const refsToInclude = new Set();
  for (const entryPoint of entryPoints) {
    dfs(entryPoint);
  }

  const filteredMap = new Map();
  for (const ref of refsToInclude.values()) {
    filteredMap.set(ref, nodesMap.get(ref));
  }

  return filteredMap;

  function dfs(ref) {
    const node = nodesMap.get(ref);
    if (!node) return;

    refsToInclude.add(node.html_url);

    for (const childrenRef of node.childrenRefs) {
      dfs(childrenRef);
    }
  }
}

function countNodes(entryPoints, nodesMap) {
  for (const entryPoint of entryPoints) {
    dfs(entryPoint);
  }

  function dfs(ref) {
    const node = nodesMap.get(ref);

    if (!node) {
      return 0;
    }

    if (node.childrenCount !== null) {
      return node.childrenCount + 1;
    }

    if (node.childrenRefs.size === 0) {
      node.childrenCount = 0;
      return 1;
    }

    let count = 0;
    for (const childrenRef of node.childrenRefs.values()) {
      count += dfs(childrenRef);
    }

    node.childrenCount = count;
    return node.childrenCount + 1;
  }
}

const user = "joshua0308";
const repos = getRepos();
const data = {};

for (const repo of repos) {
  console.log(`Processing ${repo}`);
  const parsed = readDataFromDir(repo);
  const cleaned = cleanData(parsed);
  const nodesMap = createNodes(cleaned);
  connectEdges(nodesMap);
  const entryPoints = getEntryPoints(nodesMap, repo);

  const filteredEntryPoints = filterEntryPoints(entryPoints, nodesMap, user);
  const filteredMap = filterNodesMap(filteredEntryPoints, nodesMap);

  console.log(`- total nodes     : ${nodesMap.size}`);
  console.log(`- total entries   : ${entryPoints.length}`);
  console.log(`- filtered nodes  : ${filteredMap.size}`);
  console.log(`- filtered entries: ${filteredEntryPoints.length}`);

  countNodes(filteredEntryPoints, filteredMap);

  if (filteredEntryPoints.length > 0) {
    data[repo] = {
      entryPoints: filteredEntryPoints,
      nodesMap: filteredMap
    };
  }
}

const serializedData = serialize(data);

fs.writeFileSync(
  path.join(__dirname, "../src/data.js"),
  "/* eslint-disable prettier/prettier */" +
    "\n" +
    "const data = " +
    serializedData
);

snapshotTest(serializedData);

function snapshotTest(output) {
  if (!fs.existsSync(path.join(__dirname, "../test/snapshot.txt"))) {
    console.log("Creating snapshot...");
    fs.writeFileSync(path.join(__dirname, "../test/snapshot.txt"), output);
  } else {
    const snapshot = fs.readFileSync(
      path.join(__dirname, "../test/snapshot.txt"),
      { encoding: "utf8" }
    );
    if (output === snapshot) {
      console.log("Snapshot test passed...");
    } else {
      console.log("Snapshot test failed...");
    }
  }
}
