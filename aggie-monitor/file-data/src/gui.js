const inquirer = require("inquirer");
const fs = require("fs");
const classFinder = require("./classFinder.js");
const login = require("./login.js");
const monitor = require("./monitor.js");

//Refreshes user session
async function main() {
  login.refreshSession(true).then((res) => {
    if (/\d/.test(res) == true) {
      process.kill(res);
      mainMenu();
    } else {
      mainMenu();
    }
  });
}

function mainMenu() {
  inquirer
    .prompt([
      {
        type: "list",
        name: "choice",
        message: "Select an option:",
        choices: mainOptions,
      },
    ])
    .then((answers) => {
      handleChoice(answers.choice);
    });
}

//calling main menu
function handleChoice(choice) {
  if (choice == "classSearch") {
    classFinder.main().then((res) => {
      res.classesToMonitor = res.classesToMonitor.filter(
        (i) => /^\d+$/.test(i) == true
      );
      if (res.classesToMonitor.length == 0) {
        return;
      } else {
        monitor.mainMonitor(res.classesToMonitor);
      }
    });
  } else if (choice == "sessionGenerator") {
    login.setEntireSession().then((res) => {
      process.kill(res);
      mainMenu();
    });
  } else if (choice == "exit") {
    return;
  }
}

const mainOptions = [
  {
    name: "Class Search",
    value: "classSearch",
  },
  {
    name: "Session Generator",
    value: "sessionGenerator",
  },
  {
    name: "Exit",
    value: "exit",
  },
];

module.exports = {
  main,
};
