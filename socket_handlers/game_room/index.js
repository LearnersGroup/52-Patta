const userCreateRoom = require('./userCreateRoom');
const userJoinRoom = require('./userJoinRoom');
const userLeaveRoom = require('./userLeaveRoom');
const userToggleReady = require('./userToggleReady');
const adminUpdateConfig = require('./adminUpdateConfig');
const adminKickPlayer = require('./adminKickPlayer');

module.exports = {
    userCreateRoom,
    userJoinRoom,
    userLeaveRoom,
    userToggleReady,
    adminUpdateConfig,
    adminKickPlayer,
}