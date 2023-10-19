const cheerio = require("cheerio");
const axios = require("axios");
const inquirer = require("inquirer");
const ora = require("ora");
const fuzzy = require("fuzzy");
const TreePrompt = require("inquirer-tree-prompt");
const dateFns = require("date-fns");
const axiosRetry = require("axios-retry");
const settings = require("../config/settings.json");

let classData;
const spinner = ora("Loading classes | ETA: 15s");

//finds all classes and prompts user to pick class and profs
async function main() {
  return new Promise((resolveMain) => {
    let classAbvOptions = [];
    getClassNumbers().then(async function (res) {
      classData = res;
      spinner.text = "Loaded classes";
      spinner.succeed();
      for (let i = 0; i < classData.length; i++) {
        let name = `${classData[i].classAbv}`.toUpperCase();
        classAbvOptions.push(name);
      }
      inquirer.registerPrompt(
        "checkbox-plus",
        require("inquirer-checkbox-plus-prompt")
      );
      inquirer
        .prompt([
          {
            type: "checkbox-plus",
            name: "abv",
            message:
              "Select class type(s) with space bar press <enter> once done | Type to filter and find class(es) | :",
            highlight: true,
            searchable: true,
            source: function (answersSoFar, input) {
              input = input || "";
              return new Promise(function (resolve) {
                var fuzzyResult = fuzzy.filter(input, classAbvOptions);
                var data = fuzzyResult.map(function (element) {
                  return element.original;
                });
                resolve(data);
              });
            },
          },
        ])
        .then(async (answers) => {
          let select = Object.values(answers)[0];
          let filteredClasses = classData
            .map((classInfo) => ({
              name: classInfo.classAbv,
              numbers: classInfo.classNumbers,
            }))
            .filter((classInfo) => select.includes(classInfo.name));
          inquirer.registerPrompt("tree", TreePrompt);
          inquirer
            .prompt([
              {
                type: "tree",
                multiple: true,
                loop: false,
                name: "selectedClasses",
                message:
                  "Select class(es) | → to open class(es) | | ← to close class(es) | | <space> to select class(es) | :",
                tree: filteredClasses.map((classChoice) => ({
                  value: classChoice.name,
                  children: classChoice.numbers.map((classNumber) => ({
                    name: `${classChoice.name} ${classNumber}`,
                    value: `${classChoice.name} ${classNumber}`,
                  })),
                })),
              },
            ])
            .then(async (answers) => {
              let allSelected = [];
              await Promise.all(
                answers.selectedClasses.map(async (className) => {
                  if (/\d/.test(className) == true) {
                    let classDetail = await getClassDetail(className);
                    allSelected.push({ [className]: classDetail });
                  }
                })
              );
              allSelected = Object.keys(allSelected).map((index) => ({
                courseNumber: Object.keys(allSelected[index]),
                courseOptions: Object.values(allSelected[index]),
              }));
              inquirer.registerPrompt("tree", TreePrompt);
              inquirer
                .prompt([
                  {
                    type: "tree",
                    multiple: true,
                    loop: false,
                    name: "classesToMonitor",
                    message:
                      "Select class(es) | → to open class(es) | | ← to close class(es) | | <space> to select class(es) | :",
                    tree: allSelected.map((eachSelect) => ({
                      value: eachSelect.courseNumber,
                      children: eachSelect.courseOptions.flatMap((index) =>
                        index.map((courseOption) => ({
                          name: `${courseOption.professor} | ${courseOption.schedule} | ${courseOption.instructionMode} | ${courseOption.honors}`,
                          value: courseOption.crnId,
                        }))
                      ),
                    })),
                  },
                ])
                .then((toMonitor) => {
                  resolveMain(toMonitor);
                });
            });
        });
    });
  });
}

async function getClass() {
  spinner.start();
  let tempClassAbr = [];
  return new Promise((resolve) => {
    axios
      .get("https://catalog.tamu.edu/undergraduate/course-descriptions/")
      .then((res) => {
        const $ = cheerio.load(res.data);
        let id = $("#atozindex");
        let links = id.find("a");
        links.map(async (index, value) => {
          var link = $(value).attr("href");
          if (link != null) {
            var classType = link.split("/")[3];
            tempClassAbr.push(classType);
          }
        });
        resolve(tempClassAbr);
      });
  });
}

async function getClassNumbers() {
  let classAbr = [];
  let classNumbers = [];
  return new Promise((resolve) => {
    getClass().then(async function (res) {
      classAbr = res;
      classNumbers = await Promise.all(
        classAbr.map(async (abr) => {
          return sendNumReq(abr);
        })
      );
      resolve(classNumbers);
    });
  });
}

async function sendNumReq(classAbv) {
  axiosRetry(axios, { retries: 5, retryDelay: axiosRetry.exponentialDelay });
  let res = await axios.get(
    `https://catalog.tamu.edu/undergraduate/course-descriptions/${classAbv}`
  );
  const $ = cheerio.load(res.data);
  var temp = [];
  let div = $("#textcontainer");
  let divLength = $("#textcontainer").children().length;
  for (let i = 0; i < divLength; i++) {
    var courseLength = div.find("#sc_sccoursedescs").eq(i).children().length;
    for (let j = 0; j < courseLength; j++) {
      var courseNumber = $(`#sc_sccoursedescs > div:nth-child(${j + 1}) > h2`)
        .eq(i)
        .text()
        .split(" ")[0]
        .match(/\d+/)[0];
      temp.push(courseNumber);
    }
  }
  let data = {
    classAbv: classAbv.toUpperCase(),
    classNumbers: temp,
  };
  return data;
}

async function getClassDetail(classNum) {
  let currTerm = getCurrCycle();
  var link = `https://tamu.collegescheduler.com/api/terms/${currTerm[0]}%20${
    currTerm[1]
  }%20-%20College%20Station/subjects/${classNum.split(" ")[0]}/courses/${
    classNum.split(" ")[1]
  }/regblocks`;
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: link,
    headers: {
      Cookie: `.AspNet.Cookies=${settings.aspNetCookie}; __RequestVerificationToken=${settings.requestToken}`,
    },
  };
  let res = await axios.request(config);
  var sections = res.data.sections;
  let crnArr = sections
    .map((crnInfo) => ({
      crnId: crnInfo.id,
      disabled: crnInfo.disabledReasons[0],
      professor: crnInfo.instructor[0].name,
      schedule: assembleSchedule(crnInfo.meetings),
      instructionMode: crnInfo.instructionMode,
      honors: `Honors: ${crnInfo.isHonors}`,
    }))
    .filter((crnInfo) => crnInfo.disabled != null);
  return crnArr;
}

function assembleSchedule(schedule) {
  let all = "";
  for (let i = 0; i < schedule.length; i++) {
    if (schedule[i].days != null && schedule[i].meetingType != "EXAM") {
      all += `${schedule[i].days} ${convertTime(
        schedule[i].startTime
      )}-${convertTime(schedule[i].endTime)} `;
    }
  }
  return all.substring(0, all.length - 1);
}

function convertTime(time) {
  let hour = Math.floor(time / 100);
  let ampm = hour >= 12 ? "pm" : "am";
  let date = new Date(2005, 2, 1, hour, time % 100);
  let dteFormat = dateFns.format(date, "hh:mm");
  return `${dteFormat}${ampm}`;
}

function getCurrCycle() {
  let currMonth = new Date().getMonth() + 1;
  let currYear = new Date().getFullYear();
  if (currMonth > 8) {
    return ["Spring", currYear + 1];
  } else if (currMonth > 0 && currMonth < 3) {
    return ["Spring", currYear];
  } else {
    return ["Fall", currYear];
  }
}

module.exports = {
  main,
  assembleSchedule,
};
