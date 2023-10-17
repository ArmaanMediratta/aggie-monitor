const axios = require("axios");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const locateChrome = require("locate-chrome");
const fs = require("fs");
const { DateTime } = require("luxon");
const ora = require("ora");
const settings = require("../config/settings.json");

puppeteer.use(StealthPlugin());

/*
NOTE: CODE IN HERE DOES A COUPLE OF THINGS
 - LOGS INTO TAMU ACCOUNT. NOTE BROWSER WILL BE LOGGED INTO THE USERS ACCOUNT.
 - THE SESSION IS SAVED IN THE SESSION FOLDER. MEANING ALL USER DATA IS STORED LOCALLY
 - THE BROWSER GOES TO TAMU'S SCHEDULE BUILDER AND SAVES TWO COOKIES.
 - THESE COOKIES ARE ALSO STORED LOCALLY IN SETTINGS.JSON
 - THESE COOKIES ALLOW THE MONITOR TO WORK, THIS IS WHY THE USER MUST USER THEIR TAMU ACCOUNT FOR THE APPLICATION TO WORK
 - THE APPLICATION AT NO TIME SENDS ANY DATA TO A SERVER, EVERYTHING IS LOCAL AND CAN BE ACCESSED OR DELETED
 - AT NO TIME CAN THE DEV ACCESS ANYONE'S ACCOUNT INFORMATION DUE TO EVERYTHING BEING HELD ON YOUR COMPUTER
*/

//Logs in and saves user's session
async function setEntireSession() {
  const spinner = ora("Generating Session");
  spinner.start();
  fs.rmSync("session", { recursive: true, force: true });
  let todayDate = `${new Date().getFullYear()}-0${
    new Date().getMonth() + 1
  }-${new Date().getDate()}`;
  var requestToken;
  var aspNetCookie;
  return new Promise(async (resolve) => {
    const executablePath = await new Promise((resolve) =>
      locateChrome((arg) => resolve(arg))
    );
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: executablePath,
      slowMo: 20,
      userDataDir: `session/${todayDate}-${Date.now()}`,
    });
    const pid = browser.process().pid;
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 OPR/102.0.0.0"
    );
    await page.goto("https://tamu.collegescheduler.com/");
    await page.waitForNavigation();
    spinner.text = `Logging in with ${settings.username}@tamu.edu`;
    let username = await page.$('[name="loginfmt"]');
    await username.type(`${settings.username}@tamu.edu`);
    let next = await page.$('[id="idSIButton9"]');
    await next.click();
    await sleep(2500);
    let password = await page.$('[id="i0118"]');
    await password.type(`${settings.password}`);
    let signIn = await page.$('[id="idSIButton9"]');
    await signIn.click();
    const navigationPromise = page.waitForNavigation({
      waitUntil: "domcontentloaded",
    });
    navigationPromise;
    await sleep(7000);
    var extractedText;
    try {
      extractedText = await page.$eval("*", (el) => el.innerText);
    } catch (e) {
      await sleep(5000);
      extractedText = await page.$eval("*", (el) => el.innerText);
    }
    if (
      extractedText.includes("Your account or password is incorrect") ||
      extractedText.includes("Enter a valid email address") ||
      extractedText.includes("Please enter your password") ||
      extractedText.includes("This username may be incorrect")
    ) {
      spinner.text =
        "Invalid credentials, check if your username and password are correct";
      spinner.fail();
      resolve(pid);
    } else {
      if (
        extractedText.includes("Waiting for approval") ||
        extractedText.includes(`Verify it's you`)
      ) {
        navigationPromise;
        let time = 60;
        spinner.text = `Please open Duo App & Confirm ${time}s`;
        spinner.color = "yellow";
        while (extractedText.includes("Waiting for approval") == true) {
          time--;
          extractedText = await page.$eval("*", (el) => el.innerText);
          if (extractedText.includes("timed out")) {
            spinner.text = "Duo session timed out, please remake session";
            spinner.fail();
            resolve(pid);
            break;
          }
          spinner.text = `Please open Duo App & Confirm ${time}s`;
          await sleep(850);
        }
      }
      try {
        let trustDevice = await page.$('[id="trust-browser-button"]');
        await trustDevice.click();
      } catch (e) {}
      navigationPromise;
      spinner.text = "Logged in! Generating cookies";
      spinner.color = "green";
      await sleep(5000);
      await page.goto("https://tamu.collegescheduler.com/");
      navigationPromise;
      let cookies = await page.cookies();
      for (let i = 0; i < cookies.length; i++) {
        if (cookies[i].name == "__RequestVerificationToken") {
          requestToken = cookies[i].value;
        }
        if (cookies[i].name == ".AspNet.Cookies") {
          aspNetCookie = cookies[i].value;
        }
      }
      settings.requestToken = requestToken;
      settings.aspNetCookie = aspNetCookie;
      fs.writeFileSync(
        "./file-data/config/settings.json",
        JSON.stringify(settings, null, 2)
      );
      await page.goto("https://outlook.office365.com/", {
        waitUntil: "domcontentloaded",
      });
      await sleep(7500);
      spinner.text = "Session Saved!";
      spinner.succeed();
      resolve(pid);
    }
  });
}

//logs back in and gets new cookies to send requests
async function refreshSession(spinStart) {
  const spinner = ora("Refreshing session | ETA: 10s");
  if (spinStart == true) {
    spinner.start();
  }
  return new Promise(async (resolve) => {
    if (fs.existsSync("session") == false) {
      spinner.text = "No session folder found, please generate a session";
      spinner.fail();
      resolve(false);
    } else {
      let browserSession = fs.readdirSync("session", (err) => {});
      if (browserSession.length == 1) {
        const executablePath = await new Promise((resolve) =>
          locateChrome((arg) => resolve(arg))
        );
        const browser = await puppeteer.launch({
          headless: "new",
          executablePath: executablePath,
          slowMo: 20,
          userDataDir: `session/${browserSession[0]}`,
        });
        const pid = browser.process().pid;
        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 OPR/102.0.0.0"
        );
        try {
          await page.goto("https://tamu.collegescheduler.com/", {
            waitUntil: "domcontentloaded",
          });
          await page.waitForNavigation();
        } catch (e) {
          spinner.text = "Error checking session, please restart";
          spinner.fail();
          await browser.close();
          resolve("fatal");
        }
        const navigationPromise = page.waitForNavigation({
          waitUntil: "domcontentloaded",
        });
        var extractedText = await page.$eval("*", (el) => el.innerText);
        if (extractedText.includes(`${settings.username}@tamu.edu`)) {
          let pickAccount = await page.$(
            '[class="table-cell text-left content"]'
          );
          await pickAccount.click();
          await navigationPromise;
          await page.waitForSelector("#i0118");
          let password = await page.$('[id="i0118"]');
          await password.type(`${settings.password}`);
          let signIn = await page.$('[id="idSIButton9"]');
          await signIn.click();
          await sleep(3500);
          try {
            extractedText = await page.$eval("*", (el) => el.innerText);
          } catch (e) {
            await sleep(5000);
            extractedText = await page.$eval("*", (el) => el.innerText);
          }
          if (extractedText.includes("Your account or password is incorrect")) {
            spinner.text =
              "Invalid credentials, check if your username and password are correct in settings.json";
            spinner.fail();
            resolve(pid);
          } else if (
            extractedText.includes("Waiting for approval") &
            extractedText.includes(`Verify it's you`)
          ) {
            spinner.text = "Session expired, please remake your session";
            spinner.fail();
            resolve(pid);
          } else {
            try {
              let trustDevice = await page.$('[id="trust-browser-button"]');
              await trustDevice.click();
            } catch (e) {}
            await navigationPromise;
            await sleep(1500);
            await page.goto("https://tamu.collegescheduler.com/");
            await navigationPromise;
            let cookies = await page.cookies();
            let requestToken;
            let aspNetCookie;
            for (let i = 0; i < cookies.length; i++) {
              if (cookies[i].name == "__RequestVerificationToken") {
                requestToken = cookies[i].value;
              }
              if (cookies[i].name == ".AspNet.Cookies") {
                aspNetCookie = cookies[i].value;
              }
            }
            settings.requestToken = requestToken;
            settings.aspNetCookie = aspNetCookie;
            fs.writeFileSync(
              "./file-data/config/settings.json",
              JSON.stringify(settings, null, 2)
            );
            confirmCookies().then(async (res) => {
              if (res == true) {
                if (spinStart == true) {
                  spinner.text = "Session Refreshed";
                  spinner.succeed();
                  resolve(pid);
                } else {
                  resolve(pid);
                }
              } else {
                spinner.text = "Session expired, please remake your session";
                spinner.fail();
                resolve(pid);
              }
            });
          }
        } else {
          spinner.text = "Session expired, please remake your session";
          spinner.fail();
          resolve(pid);
        }
      }
    }
  });
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
  setEntireSession,
  refreshSession,
};
