import Bot from './Bot';

process.setMaxListeners(0);

async function startBot() {
    const bot = new Bot();
    await bot.start();
}

startBot().catch((err) => console.error(err));
