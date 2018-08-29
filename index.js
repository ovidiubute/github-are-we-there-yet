const fetch = require("node-fetch");
const express = require("express");
const exphbs = require("express-handlebars");
const round = require("./round");

const ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const query = `
  query {
    repository(owner:"react-puzzle-games", name:"15-puzzle") {
      languages(first: 3, orderBy: {field: SIZE, direction: DESC}) {
        edges() {
          size,
          node() {
            name,
            color
          }
        }
      }
    }
  }`;

const app = express();
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.get("/", function(req, res) {
  fetch("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({ query }),
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`
    }
  })
    .then(res => res.json())
    .then(body => {
      console.log(JSON.stringify(body));
      // Example body
      // {"data":{"repository":{"languages":{"edges":[{"size":29412,"node":{"name":"JavaScript","color":"#f1e05a"}},{"size":501,"node":{"name":"HTML","color":"#e34c26"}},{"size":291,"node":{"name":"CSS","color":"#563d7c"}}]}}}}
      const result = { languages: [] };

      let totalBytes = 0;
      let isTS100 = false;
      let jsPercent = 0;
      let tsPercent = 0;
      for (edge of body.data.repository.languages.edges) {
        totalBytes += edge.size;
        result["languages"].push({
          name: edge.node.name,
          color: edge.node.color,
          totalBytes: edge.size,
          percent: 0
        });
      }

      let totalPercentages = 0;
      for (language of result["languages"]) {
        const p = round(language["totalBytes"] / totalBytes) * 100;
        language["percent"] = p;
        totalPercentages += p;

        if (language["name"] === "TypeScript") {
          tsPercent = p;
          if (p >= 90) {
            isTS100 = true;
          }
        }

        if (language["name"] == "JavaScript") {
          jsPercent = p;
        }
      }

      if (totalPercentages < 100) {
        result["languages"].push({
          name: "Other",
          color: "#000000",
          totalBytes: 0, // Consistency
          percent: 100 - totalPercentages
        });
      }

      result.isTS100 = isTS100;
      result.jsPercent = jsPercent;
      result.tsPercent = tsPercent;

      res.render("home", result);
    })
    .catch(error => {
      console.error(error);

      res.render("error", error);
    });
});

app.listen(3000, () => console.log("GitHub app listening on port 3000!"));
