![ESLint](https://github.com/NewCircuit/ping-pewds/actions/workflows/eslint.yml/badge.svg?style=flat-square)

# Discord Ping Blocker (ping-pewds)

### This is a Discord bot written in Typescript, using the [Sapphire Framework](https://www.sapphirejs.dev/)

#### [View Available Commands](docs/commands.md)

## Requirements
* [NodeJS](https://nodejs.org/)
* [Postgres](https://www.postgresql.org/)

## Setup

After installing the requirements listed above, run either
```node
yarn install
npm install
```

Once all the dependencies are installed, compile the project using one of the following commands ,
and a `lib` directory will be generated.
```node
yarn build
npm build
```

Create a copy of the `config.default.yml` and name it `config.yml`
and configure the bot the way you see fit. ([See Options](#Configuration))

## Starting

If you use `pm2`, you can either call the `./lib/index.js` or run one of the 
following commands to use the included ecosystem file.
**Note:** any other process manager will require you to use `./lib/index.js` directly
```node
yarn pm2
npm run pm2
```

## Configuration

### Bot specific configuration
|Key|Default|Description|
|---|---|---|
|dryrun|`false`|Prevents actually performing the discord punishment, however will insert a record into the database|
|token|None|The oauth bot token provided by Discord|
|prefix|`!`|The string the bot looks for to indicate a command is fired|
|guild|None|The Guild ID to monitor (currently only watches one guild)|
|owners|`[]`|An array of owner snowflakes|
|blockTimeout|`10`|The delay in minutes to stop blocking pings if a `block`ed user has spoken|
|block|`[]`|The user IDs that the bot will listen for and block mentions of|
|notifyTimeout|`10`|The delay in minutes until `notifyRoles` are notified that a `block`ed user is no longer active|
|notifyRoles|`[]`|The role IDs that will get notified when a `block`ed user becomes active|
|notifyChannels|`[]`|The channel IDs that a message will be sent to notify `notifyRoles`|
|excludedChannels|`[]`|The channel IDs that the bot will completely ignore|
|moderatorRoles|`[]`|The role IDs that the bot should consider moderators|
|lenientRoles|`[]`|The role IDs that should be considered lenient when punishing|
|muteRole|`''`|The role ID that will be assigned to *mute* them.|

### Database specific configuration
|Key|Default|Description|
|---|---|---|
|host|`localhost`|The database server location|
|port|`5432`|The port the database uses|
|user|None|The database user to use|
|pass|None|The database user's password|
|schema|`ping_pewds`|The schema in the database that is used|
|database|`floorgang`|The database used|
|connections|`10`|The maximum allowed connections created by the database|

