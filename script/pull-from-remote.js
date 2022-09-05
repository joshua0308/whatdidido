const fs = require("fs");
const path = require("path");

const { Octokit } = require("@octokit/core");
const { paginateRest } = require("@octokit/plugin-paginate-rest");

run()
  .then(() => {
    console.log("done");
  })
  .catch((e) => {
    console.log(e);
  });

async function run() {
  const org = "org name";
  const repos = ["repo name"];
  const githubAuth = "";

  const MyOctokit = Octokit.plugin(paginateRest);
  const octokit = new MyOctokit({ auth: githubAuth });

  if (!fs.existsSync(path.join(__dirname, "../data"))) {
    fs.mkdirSync(path.join(__dirname, "../data"));
  }

  for (const repo of repos) {
    const dataDir = path.join(__dirname, "../data");
    if (fs.existsSync(path.join(dataDir, repo))) {
      console.log(`Skipping ${repo}...`);
      continue;
    }

    if (!fs.existsSync(path.join(dataDir, repo))) {
      fs.mkdirSync(path.join(dataDir, repo));
    }

    console.log(`Starting ${repo}...`);
    for (const type of ["issues"]) {
      const iterator = octokit.paginate.iterator(
        `GET /repos/${org}/{repo}/${type}`,
        {
          repo,
          state: "all",
          sort: "created",
          direction: "asc",
          per_page: 100
        }
      );

      let page = 0;
      for await (const { data } of iterator) {
        fs.writeFileSync(
          path.join(dataDir, repo, `${type}-${page}.json`),
          JSON.stringify(data, null, 2)
        );
        page += 1;
      }
    }
  }
}
