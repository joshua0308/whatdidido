## What did I do?

This is a tool to easily view all of your github issues and pull requests in one place.

First, pull all issues/prs from repos that you've worked on using the Github API. This could be done by running the `yarn pull-from-remote` script.

You have to provide some details such as `Github API Token`, `Organization`, `Repositories`.

After pulling the data, run `yarn create-tree` to create a tree structure that could be parsed by the frontend. `src/data.js` should be created.

The last step is to run `yarn start`. It will open the html page locally and you will be able to view all the issues/prs you've worked on in one place.