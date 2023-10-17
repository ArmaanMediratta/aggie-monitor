const axios = require("axios");
const ora = require("ora");
const axiosRetry = require("axios-retry");
let nodemailer = require("nodemailer");
const settings = require("../config/settings.json");
const login = require("./login.js");
const classFinder = require("./classFinder.js");

//email here is what sends notification to user
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "aggiemonitor@gmail.com",
    pass: "oygn vdyz qigx zemv",
  },
});


//monitoring
async function mainMonitor(crnsToMonitor) {
  const spinner = ora("Monitoring");
  spinner.start();
  let currCrnMonitor = crnsToMonitor;
  while (currCrnMonitor.length > 0) {
    await sleep(8500);
    const cookiesConfirmed = await confirmCookies();
    if (cookiesConfirmed == true) {
      for (let i = 0; i < currCrnMonitor.length; i++) {
        let res = await getCrnInfo(currCrnMonitor[i], "seats");
        if (res[0].openSeats != 0) {
          let classInfo = await getCrnInfo(currCrnMonitor[i], "classInfo");
          var mailOptions = {
            from: "aggiemonitor@gmail.com",
            to: `${settings.username}@tamu.edu`,
            subject: `CRN ${res[0].id} is Open!`,
            text: `${res[0].openSeats} seat(s) have opened up for ${classInfo[0].classType}\n - ${classInfo[0].professor}\n - ${classInfo[0].schedule}\n - ${classInfo[0].instructionMode}`,
          };
          transporter.sendMail(mailOptions);
          currCrnMonitor = currCrnMonitor.filter((crn) => crn != res[0].id);
        }
      }
    } else {
      let pid = await login.refreshSession(false);
      process.kill(pid);
    }
  }
  spinner.text = "All classes monitored, closing in 10 seconds";
  spinner.succeed();
  await sleep(10000);
  return;
}

async function getCrnInfo(crn, type) {
  axiosRetry(axios, { retries: 1000, retryDelay: axiosRetry.exponentialDelay });
  return new Promise(async (resolve) => {
    var link = `https://tamu.collegescheduler.com/api/terms/Fall%202023%20-%20College%20Station/course/section/${crn}`;
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: link,
      headers: {
        Cookie: `.AspNet.Cookies=${settings.aspNetCookie}; __RequestVerificationToken=${settings.requestToken}`,
      },
    };
    let res = await axios.request(config);
    let crnInfo = `${res.data.course.subjectId} ${res.data.course.number}`;
    if (type === "seats") {
      checkInfo(crnInfo, crn, "seats").then((res) => {
        resolve(res);
      });
    } else if (type === "classInfo") {
      checkInfo(crnInfo, crn, "classInfo").then((res) => {
        resolve(res);
      });
    }
  });
}

async function checkInfo(crnClassType, crnID, type) {
  axiosRetry(axios, {
    retries: 1000,
    retryDelay: axiosRetry.exponentialDelay,
  });
  var link = `https://tamu.collegescheduler.com/api/terms/Fall%202023%20-%20College%20Station/subjects/${
    crnClassType.split(" ")[0]
  }/courses/${crnClassType.split(" ")[1]}/regblocks`;
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
  if (type === "seats") {
    let crnArr = sections
      .map((crnInfo) => ({
        id: parseInt(crnInfo.id),
        openSeats: crnInfo.openSeats,
      }))
      .filter((crnInfo) => crnInfo.id == crnID);
    return crnArr;
  } else if (type === "classInfo") {
    let crnArr = sections
      .map((crnInfo) => ({
        id: parseInt(crnInfo.id),
        disabled: crnInfo.disabledReasons[0],
        professor: crnInfo.instructor[0].name,
        schedule: classFinder.assembleSchedule(crnInfo.meetings),
        instructionMode: crnInfo.instructionMode,
        honors: `Honors: ${crnInfo.isHonors}`,
        classType: crnClassType,
      }))
      .filter((crnInfo) => crnInfo.id == crnID);
    return crnArr;
  }
}

async function confirmCookies() {
  let aspNetCookie = settings.aspNetCookie;
  let requestToken = settings.requestToken;
  return new Promise((resolve) => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: "https://tamu.collegescheduler.com/api/terms/",
      headers: {
        Cookie: `.AspNet.Cookies=${aspNetCookie}; __RequestVerificationToken=${requestToken}`,
      },
    };

    axios
      .request(config)
      .then((res) => {
        if (res.data.includes("Working...")) {
          resolve(false);
        } else {
          resolve(true);
        }
      })
      .catch((error) => {
        resolve(false);
      });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  mainMonitor,
};
