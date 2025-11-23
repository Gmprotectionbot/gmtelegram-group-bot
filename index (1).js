import { Telegraf } from "telegraf";
import fs from "fs";

// ---------------------------
// CONFIG (Fill your NEW bot token here)
// ---------------------------
const bot = new Telegraf("8458211982:AAELPAqVg_LldkqPJlcijIiRFLhMxPVNy7I");  // ← paste NEW token inside quotes

// Data JSON
let data = {
  welcome: "👋 Welcome {name}!",
  locks: { gif: true, link: true },
  warnings: {}
};

// Load Data
if (fs.existsSync("data.json")) {
  data = JSON.parse(fs.readFileSync("data.json"));
}

const save = () =>
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

// Check Admin
async function isAdmin(ctx, uid) {
  try {
    const admins = await ctx.getChatAdministrators();
    return admins.some((a) => a.user.id === uid);
  } catch {
    return false;
  }
}

// ----------------------------
// WELCOME SYSTEM
// ----------------------------
bot.on("new_chat_members", async (ctx) => {
  const name = ctx.message.new_chat_members[0].first_name;
  const txt = data.welcome.replace("{name}", name);
  await ctx.reply(txt);
});

// Update Welcome
bot.command("setwelcome", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;

  const msg = ctx.message.text.split(" ").slice(1).join(" ");
  if (!msg) return ctx.reply("Use: /setwelcome Welcome {name}");

  data.welcome = msg;
  save();
  ctx.reply("✅ Welcome message updated.");
});

// ----------------------------
// MUTE / UNMUTE
// ----------------------------
bot.command("mute", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;

  if (!ctx.message.reply_to_message)
    return ctx.reply("Reply to mute.");

  const target = ctx.message.reply_to_message.from.id;

  await ctx.telegram.restrictChatMember(ctx.chat.id, target, {
    can_send_messages: false,
  });

  ctx.reply("🔇 User muted.");
});

bot.command("unmute", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;

  if (!ctx.message.reply_to_message)
    return ctx.reply("Reply to unmute.");

  const target = ctx.message.reply_to_message.from.id;

  await ctx.telegram.restrictChatMember(ctx.chat.id, target, {
    can_send_messages: true,
  });

  ctx.reply("🔊 User unmuted.");
});

// ----------------------------
// KICK / BAN / UNBAN
// ----------------------------
bot.command("kick", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;

  if (!ctx.message.reply_to_message)
    return ctx.reply("Reply to kick.");

  const target = ctx.message.reply_to_message.from.id;

  await ctx.kickChatMember(target);
  ctx.reply("👢 User kicked.");
});

bot.command("ban", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;

  if (!ctx.message.reply_to_message)
    return ctx.reply("Reply to ban.");

  const target = ctx.message.reply_to_message.from.id;

  await ctx.banChatMember(target);
  ctx.reply("🚫 User banned.");
});

bot.command("unban", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;

  const id = ctx.message.text.split(" ")[1];
  await ctx.unbanChatMember(id);
  ctx.reply("✅ User unbanned.");
});

// ----------------------------
// WARN SYSTEM
// ----------------------------
bot.command("warn", async (ctx) => {
  if (!ctx.message.reply_to_message) return;

  const chat = ctx.chat.id;
  const uid = ctx.message.reply_to_message.from.id;

  if (!data.warnings[chat]) data.warnings[chat] = {};
  if (!data.warnings[chat][uid]) data.warnings[chat][uid] = 0;

  data.warnings[chat][uid]++;
  save();

  const count = data.warnings[chat][uid];
  ctx.reply(`⚠ Warning: ${count}`);

  if (count >= 3) {
    await ctx.kickChatMember(uid);
    ctx.reply("🚫 Auto-Kicked (3 warnings)");
    data.warnings[chat][uid] = 0;
    save();
  }
});

// Reset Warn
bot.command("resetwarn", async (ctx) => {
  if (!ctx.message.reply_to_message) return;

  const chat = ctx.chat.id;
  const uid = ctx.message.reply_to_message.from.id;

  delete data.warnings[chat][uid];
  save();

  ctx.reply("🔄 Warnings reset.");
});

// ----------------------------
// GIF LOCK
// ----------------------------
bot.command("lockgif", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;
  data.locks.gif = true;
  save();
  ctx.reply("🔐 GIF Lock Enabled");
});

bot.command("unlockgif", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;
  data.locks.gif = false;
  save();
  ctx.reply("🔓 GIF Lock Disabled");
});

bot.on(["animation", "sticker"], async (ctx) => {
  if (data.locks.gif && !(await isAdmin(ctx, ctx.from.id))) {
    await ctx.deleteMessage().catch(() => {});
  }
});

// ----------------------------
// LINK LOCK
// ----------------------------
bot.command("locklink", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;
  data.locks.link = true;
  save();
  ctx.reply("🔐 Link Lock Enabled");
});

bot.command("unlocklink", async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;
  data.locks.link = false;
  save();
  ctx.reply("🔓 Link Lock Disabled");
});

bot.on("text", async (ctx) => {
  if (data.locks.link && /https?:\/\//i.test(ctx.message.text)) {
    if (!(await isAdmin(ctx, ctx.from.id))) {
      await ctx.deleteMessage().catch(() => {});
    }
  }
});

// ----------------------------
// START BOT
// ----------------------------
bot.launch();
console.log("🚀 Bot is running...");