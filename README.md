
# Aggie Class Monitor

Allows students at Texas A&M University to monitor when their classes have seats open. **FOR COLLEGE STATION STUDENTS ONLY**
## Getting Started

- [Installation](#Installation)
- [How to Use](#How-to-Use)
  - [Config](#config)
      - [Auth Details](#auth-details)
      - [Cookies](#cookies)
  - [Opening for the First Time](#opening-for-the-first-time)
    - [Generating a Session](#generating-a-session)
    - [Session Storage](#session-storage)
  - [Class Search](#class-search)
  - [Monitor](#monitor)
- [FAQ](#FAQ)

## Installation

### First Steps

- In order to use this application [Node js](https://nodejs.org/en/) must be installed. 
- Download the "aggie-monitor" folder. Install the folder into your desired location. Once installed your folder should look something like this. ![ Folder](https://i.gyazo.com/fef3d793a29e898422dcb63159db96ff.png)

#### File-data
File data has two folders, but you only need to worry about one. ![ Folder](https://i.gyazo.com/8dfa7c9dc3b8c6c1213e367910bc0172.png)

##### Config Folder
- When you open config, you will see a file called "settings.json". DO NOT delete this file. This is where you will enter your tamu username and password

##### Src
- Src is the code for the project. Feel free to browse the code. Note if you do delete a file the project will not work.

### Final Installation
- After installing "aggie-monitor" folder, right click on the folder and open with "terminal".![ terminal](https://i.gyazo.com/b857f097eeb08fc9c52b4bda3eabdda5.png)

- Once the terminal is open type "npm install" and click enter. Let ALL files download. This process takes sometime, but it will only be needed to do once. This is how the terminal will look once its done.![ terminal](https://i.gyazo.com/e086e005e8fff6a35442620e64d4d813.png)

- You'll notice that the "aggie-monitor" folder has had 2 new folders added: "node_modules & package-lock" DO NOT delete either of these folders.

- By the end of the installation your folder should look like this. ![ terminal](https://i.gyazo.com/46c21afdfc68edee58ec7c5f8524c001.png)



## Running Program

- To run this application, right click on the "aggie-monitor" folder and open with "terminal".

- Type in "node runner" and hit enter. This is how the program must run everytime via the terminal.
## How to Use

### Config

The file "settings.json" must always be in the config folder as the application requires it.

#### Auth Details
In the config file you will have two empty fields. Enter your tamu username and password into the fields. NOTE: Do not put your UIN.
```json
{
  "username": "demouser",
  "password": "demopass"
}
```

#### Cookies
After setting the application up for the first time your config file will change to look like this. Make sure to NOT delete the two new cookie fields. These allow the monitor to work and without it won't be able to monitor for class openings.
```json
{
  "username": "demouser",
  "password": "demopass",
  "requestToken": "democookie1",
  "aspNetCookie": "democookie2"
}
```

### Opening for the First Time
The first time you open the application your session will be invalid! That is totally normal!


![invalid Session](https://i.gyazo.com/5fb2e5d26933d8082298ee6b71a48256.png)

#### Generating a Session
Generating a session is needed to run the monitor. Simply click on the "Session Generator" and follow the steps prompted. You will need to have the DUO moblie app for this to work. Once the session is made you will not need to confirm via duo until your session expires which usually expires within a month.

#### Session Storage
If you take a look in your folder there will be a need folder named "session" with the date it was created. This is where your browser data is located. If needed, you can delete the session folder and that browser data will be gone. This means that a new session must be generated.

### Class Search
Click on the "Class Search" option. The application will then load every class from tamu's class catalog. Once loaded you will be able to select your desired class type, class level, and professor for the class. Make sure to read the navigation keys in the application.

![Load catalog](https://i.gyazo.com/1e65fffb0a09b5e73963b1282a07ba6a.png)

![Class level](https://i.gyazo.com/e022329df4989ef8ac26871278709315.png)

![profs](https://i.gyazo.com/7bfac0c7c9ba8ee5ccac379c9ce5315d.png)

Note: The monitor will only show professors that have 0 seats in their class

### Monitor
Once your desired classes have been selected, the monitor will begin to monitor. Once a class has an empty seat aggiemonitor@gmail.com will email your tamu email. At this point is there nothing else to do!


## FAQ

#### Why do I have to put my login information?

In order for the application to monitor when seats have opened, TAMU's site requires a TAMU student login in to access the seat information.

#### Where is my data stored?

Everything is stored locally. The session folder is where all your data is. Think of the session folder as your browser. All your data is stored within that folder and only you can access that folder. Moreover, this application has no connection to a server, meaning everything is stored locally. Your username and password in the config is also stored locally. All these files cannot be accessed by me.

#### Why are there no professors in my class

There are two reasons
 - Your class has no full classes
 - TAMU is currently not offering that class

#### Can I change the classes I want to monitor

Of course! Your can just open another instance of the application or restart the current one running.

