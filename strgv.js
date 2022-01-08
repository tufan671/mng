const Discord = require('discord.js')
const client = new Discord.Client({ fetchAllMembers: true })
const fs = require('fs')
const Main = require('./Manager/Main.json')
const raviwen = require('./Manager/Raviwen.json')
const moment = require('moment')
const ms = require('ms')
const db = require('quick.db')

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.cooldown = new Set();



client.on('ready', async () => {
    client.user.setActivity(`${Main.Status}`, { type: 'PLAYING'})
    .then(console.log(`${client.user.tag} İsmiyle Discord APİ Bağlantısı kuruldu.`))
    .catch(() => console.log(`Bir hata ile karşılaştım.`))
})



  fs.readdir('./Register', (err, files) => { 
    files.forEach(fs => { 
    let command = require(`./Register/${fs}`); 
    client.commands.set(command.config.name, command);
    if(command.config.aliases) command.config.aliases.forEach(Aliases => client.aliases.set(Aliases, command.config.name));
    });
  });

  fs.readdir('./Guild', (err, files) => { 
    files.forEach(fs => { 
    let command = require(`./Guild/${fs}`); 
    client.commands.set(command.config.name, command);
    if(command.config.aliases) command.config.aliases.forEach(Aliases => client.aliases.set(Aliases, command.config.name));
    });
  });

  client.on('message', async message => {
    if (!message.guild || message.author.bot || message.channel.type === 'dm') return;
    let prefix = Main.Prefix.filter(p => message.content.startsWith(p))[0]; 
    if (!prefix) return;
    let args = message.content.split(' ').slice(1);
    let command = message.content.split(' ')[0].slice(prefix.length); 
    let load = client.commands.get(command) || client.commands.get(client.aliases.get(command));
    
    if (load){
     if (!message.member.hasPermission(8) && client.cooldown.has(message.author.id)) return message.channel.send(new MessageEmbed().setDescription('**5** Saniyede bir komut kullanabilirsin.').setFooter(Main.Footer).setColor('RANDOM').setTimestamp());
      client.cooldown.add(message.author.id);
      setTimeout(() => client.cooldown.delete(message.author.id), 5000);
      load.raviwen(client, message, args);
    };
  });

 
client.on('guildMemberAdd', async member => {
      if(member.user.username.includes(Main.Tag)){
        await member.roles.add(raviwen.Register.TagRol)
        client.channels.cache.get(raviwen.Log.TagLog).send(new Discord.MessageEmbed().setColor('RANDOM').setDescription(`${member} aramıza doğuştan taglı bir şekilde katıldı.`))
      }
})

client.on('userUpdate', async (oldUser, newUser) => {
      const guild = client.guilds.cache.get(Main.GuildID)
      const member = guild.members.cache.get(newUser.id)
      if(newUser.username !== oldUser.username){
        if(oldUser.username.includes(Main.Tag) && !newUser.username.includes(Main.Tag)){
          member.roles.cache.has(raviwen.Roller.Booster) ? member.roles.set([raviwen.Roller.Booster, raviwen.Register.unreg]) : member.roles.set([raviwen.Register.unreg])
          client.channels.cache.get(raviwen.Log.TagLog).send(new Discord.MessageEmbed().setColor("GREEN").setDescription(`${newUser} isminden \`${Main.Tag}\` bırakarak aramızdan ayrıldı. Kişinin rollerini çekip kayıtsıza attım.`))
        } else if(!oldUser.username.includes(Main.Tag) && newUser.username.includes(Main.Tag)){ 
          await member.roles.add(raviwen.Register.TagRol)
          client.channels.cache.get(raviwen.Log.TagLog).send(new Discord.MessageEmbed().setColor("GREEN").setDescription(`${newUser} ismine \`${Main.Tag}\` alarak ailemize katıldı`))
}}})
// Mute
client.on('guildMemberAdd', async (member) => {
  let muteli = db.fetch(`muteli.${member.id}.${member.guild.id}`)
  let zaman =  db.fetch(`süre.${member.id}.${member.guild.id}`)
  if(!muteli) return;
  if(muteli == 'muteli'){
    member.roles.add(raviwen.Roller.Muted)
    client.channels.cache.get(raviwen.Log.MuteLog).send(new Discord.MessageEmbed().setDescription(`${member} Sunucumuza giriş yaptı. Cezalıyken çıkış yaptığı için tekrardan cezasını verdim.`))
 
    setTimeout(async () => {
      client.channels.cache.get(raviwen.Log.MuteLog).send(new Discord.MessageEmbed().setDescription(`${member} Yazılı kanallardan susturması sona erdi. Muhabbet etmeye devam edebilir.`))
      await db.delete(`muteli.${member.id}.${member.guild.id}`)
      await db.delete(`süre.${member.id}.${message.author.id}`)
      await member.roles.remove(raviwen.Roller.Muted)
    }, ms(zaman));
  }
})
// Jail
client.on('guildMemberAdd', async (member) => {
  let cezali = db.fetch(`cezalı.${member.id}.${member.guild.id}`)
  let zaman = db.fetch(`süre.${member.id}.${member.guild.id}`)
  if(!cezali) return;
  if(cezali == 'cezalı'){
    member.roles.cache.has(raviwen.Roller.Booster) ? member.roles.set([raviwen.Roller.Booster, raviwen.Roller.Jailed]) : member.roles.set([raviwen.Roller.Jailed])
    client.channels.cache.get(raviwen.Log.JailLog).send(new Discord.MessageEmbed().setDescription(`${member} Sunucumuza giriş yaptı. Datasında kayıtlı ceza bulunduğu için bulunan cezayı tekrardan işledim.`))
    setTimeout(async () => {
      client.channels.cache.get(raviwen.Log.JailLog).send(new Discord.MessageEmbed().setDescription(`${member} Sunucuda ki cezası kaldırıldı. Tekrardan sesli ve yazılı kanallara ulaşabilir.`))
      await db.delete(`cezalı.${member.id}.${message.guild.id}`)
      await db.delete(`süre.${member.id}.${message.author.id}`)
      await member.roles.remove(raviwen.Roller.Jailed)
      await member.roles.add(raviwen.Register.unreg)
    }, ms(zaman));
  }
})
// VMute
client.on('guildMemberAdd', async (member) => {
  let vmuteli = db.fetch(`vmuteli.${member.id}.${member.guild.id}`)
  let zaman = db.fetch(`süre.${member.id}.${member.guild.id}`)
  if(!vmuteli) return;
  if(vmuteli == 'vmuteli'){
    client.channels.cache.get(raviwen.Log.VMuteLog).send(new Discord.MessageEmbed().setDescription(`${member} Sunucumuza giriş yaptı. Datasında kayıtlı ceza bulunduğu için bulunan cezayı tekrardan işledim.`))
    await member.roles.add(raviwen.Roller.VMuted)

    setTimeout(async () => {
      client.channels.cache.get(raviwen.Log.MuteLog).send(new MessageEmbed().setDescription(`${member} Yazılı kanallardan susturması sona erdi. Muhabbet etmeye devam edebilir.`))
      await db.delete(`vmuteli.${member.id}.${member.guild.id}`)
      await db.delete(`süre.${member.id}.${member.author.id}`)
      await member.roles.remove(raviwen.Roller.VMuted)
    }, ms(zaman));
}})
client.login(Main.Token).catch(() => console.log('Discord APİ bağlantasını kuramadım. Tokeni kontrol ediniz.'))