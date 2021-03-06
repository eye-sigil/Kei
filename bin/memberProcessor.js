var dbUtils = require('./db/dbUtils');
var dbGuild = require('./db/dbGuild');
var discordUtils = require('./utils/discordUtils');

var memberRoleName = {};

module.exports = function(client, member) {
	if(member == null) return;
    //We avoid calling the DB if the user has the role already
    if (memberRoleName[member.guild.id] && member.roles.exists(r => r.name.toLowerCase() == memberRoleName[member.guild.id])) {
        return;
    }

    dbGuild.fetchGuild(member.guild.id, function(err, guildData) {
        if (err) return console.log(err);
        //We check if the server has a member role different from default
        if (!memberRoleName[member.guild.id]) {
            memberRoleName[member.guild.id] = 'member';
            if (guildData && guildData.hasOwnProperty('member')) {
                memberRoleName[member.guild.id] = guildData.member;
            }
            //Check if user has the role already
            if (member.roles.exists(r => r.name.toLowerCase() == memberRoleName[member.guild.id])) {
                return;
            }
        }

        if (!member.guild.roles.exists(r => r.name.toLowerCase() == memberRoleName[member.guild.id])) {
            return;
        }

        var memberRole = member.guild.roles.find(r => r.name.toLowerCase() == memberRoleName[member.guild.id]);

        //If the server has the automember enabled we do
        if (guildData && guildData.hasOwnProperty('automember') && guildData.automember) {
            dbUtils.fetchUserActivity(member.guild.id, member.user.id, 7, (err, res) => {
                if (err) return console.log(err);
                if (res.length >= 4) {
                    var promote = 0;
                    for (var day of res) {
                        if (day.msgs > 35) {
                            promote++;
                        }
                    }
                    if (promote >= 3) {
                        if (member.roles.exists(r => r.name.toLowerCase() == 'lurker')) {
                            member.removeRole(member.roles.find(r => r.name.toLowerCase() == 'lurker')).then(() => {
                                setTimeout(() => {
                                    addToRole();
                                }, 1000);
                            }).catch(addToRole);
                        } else {
                            addToRole();
                        }

                        function addToRole() {
                            member.addRole(memberRole).then(() => {
                                console.log("Membered " + member.user.username);

                                var channel = discordUtils.findActivityChannel(member.guild);
                                if (channel) {
                                    channel.sendMessage(`Congratulations ${member} you are now a member!`);
                                }
                            }).catch(console.log);

                        }
                    }
                }
            });
        }
    });
}
