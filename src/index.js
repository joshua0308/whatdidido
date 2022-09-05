/* eslint-disable no-undef */
const navBar = document.querySelector(".top");
const leftTab = document.querySelector(".left");
const rightTab = document.querySelector(".right");
const rightTitle = rightTab.querySelector("h1");
const rightTable = rightTab.querySelector(".metadata-table");
const rightBody = rightTab.querySelector("p");
const highlightColor = "lightblue";

for (const repo of Object.keys(data)) {
  const repoListItem = document.createElement("li");
  repoListItem.setAttribute("repo", repo);

  const repoName = document.createElement("span");
  repoName.innerText = repo;

  const repoNodesCountSpan = document.createElement("span");
  repoNodesCountSpan.innerText = `[${
    Object.values(data[repo].nodesMap).length
  }]`;
  repoNodesCountSpan.style.marginLeft = "5px";
  repoNodesCountSpan.style.color = "grey";

  repoListItem.appendChild(repoName);
  repoListItem.appendChild(repoNodesCountSpan);

  repoListItem.addEventListener("click", function (e) {
    const list = e.target.closest("li");
    const repo = list.getAttribute("repo");
    const { entryPoints, nodesMap } = data[repo];

    // sort issues by total count
    const sortedEntryPoints = entryPoints.sort((a, b) => {
      const aCount = nodesMap[a].childrenCount;
      const bCount = nodesMap[b].childrenCount;
      return bCount - aCount;
    });

    // highlight selected repo
    list.style.backgroundColor = highlightColor;

    // remove highlight from other repos
    for (const l of navBar.querySelectorAll("li")) {
      if (l !== list) {
        l.style.backgroundColor = "white";
        l.classList.remove("selected");
      }
    }

    // clear left tab
    deleteChildren(leftTab);

    // populate issues on left tab
    for (const ref of sortedEntryPoints) {
      createIssueListItem(ref, nodesMap);
    }
  });

  navBar.appendChild(repoListItem);
}

function createIssueListItem(ref, nodesMap, level = 0) {
  const node = nodesMap[ref];
  if (!node) return;

  const issueDiv = document.createElement("div");
  issueDiv.classList.add("list");
  issueDiv.classList.add("collapse");
  if (level > 0) {
    issueDiv.classList.add("noshow");
  }

  issueDiv.addEventListener("click", (e) => {
    const list = e.target.closest(".list");
    list.style.backgroundColor = highlightColor;
    list.parentNode.childNodes.forEach((node) => {
      if (node !== list) {
        node.style.backgroundColor = "white";
      }
    });
    const node = nodesMap[ref];
    console.log(node);
    populateNodeData(node);
  });

  const titleContainer = document.createElement("div");
  titleContainer.style.paddingLeft = level * 30 + "px";

  const titleSpan = document.createElement("span");
  titleSpan.innerHTML = node.title;

  const dropdownLink = document.createElement("a");
  dropdownLink.setAttribute("n", node.childrenCount);
  if (node.childrenCount > 0) {
    dropdownLink.innerText = `[${node.childrenCount} more]`;
  }

  dropdownLink.addEventListener("click", function (e) {
    const link = e.target;
    const n = Number(link.getAttribute("n"));
    const issue = link.closest(".list");
    const issues = Array.from(issue.parentNode.childNodes);
    const head = issues.indexOf(issue);
    const end = head + n + 1;

    if (issue.classList.contains("collapse")) {
      // if collapsed, expand
      issue.classList.remove("collapse");
      link.innerText = "[–]";

      let cur = head + 1;
      while (cur < end) {
        const curIssue = issues[cur];
        curIssue.classList.remove("noshow");

        // if sublist is collpased, don't expand it
        if (curIssue.classList.contains("collapse")) {
          cur += 1 + Number(curIssue.querySelector("a").getAttribute("n"));
        } else {
          cur += 1;
        }
      }
    } else {
      // if expanded, collapse
      issue.classList.add("collapse");
      if (n > 0) {
        link.innerText = `[${n} more]`;
      }

      let cur = head + 1;
      while (cur < end) {
        const curIssue = issues[cur];
        curIssue.classList.add("noshow");
        cur += 1;
      }
    }

    e.stopPropagation();
  });

  titleContainer.appendChild(titleSpan);
  titleContainer.appendChild(dropdownLink);
  issueDiv.appendChild(titleContainer);
  leftTab.appendChild(issueDiv);

  for (const childRef of node.childrenRefs) {
    createIssueListItem(childRef, nodesMap, level + 1);
  }
}

function deleteChildren(parent) {
  while (parent.lastChild) {
    parent.removeChild(parent.lastChild);
  }
}

function populateNodeData(node) {
  rightTitle.innerText = node.title;

  deleteTableRows(rightTable);

  addRow(rightTable, "Type", node.type);
  addRow(rightTable, "Number", node.number);
  addRow(rightTable, "Author", node.user);
  addRow(rightTable, "Created At", node.createdAt.split("T")[0]);
  addRow(rightTable, "Updated At", node.updatedAt.split("T")[0]);

  rightBody.innerHTML = marked.parse(node.body || "");
}

function deleteTableRows(table) {
  while (table.rows.length) {
    table.deleteRow(0);
  }
}

function addRow(table, title, content) {
  const row = table.insertRow();

  const titleElement = document.createElement("td");
  titleElement.innerText = title;

  const contentElement = document.createElement("td");
  contentElement.innerText = content;

  row.appendChild(titleElement);
  row.appendChild(contentElement);
}
