import { GuildMember } from 'discord.js';
import { CONFIG } from '../globals';
import { TargetType } from '../database/types';

export function minutesToReadable(minutes?: number | null): string {
    if (typeof minutes !== 'number') {
        return '0 minutes';
    }
    let hours = 0;
    let days = 0;
    if (minutes >= 60) {
        hours = minutes / 60;
        minutes %= 60;
    }
    if (hours >= 24) {
        days = hours / 24;
        hours %= 24;
    }
    let str = '';
    if (minutes > 0) {
        str = `${Math.floor(minutes)} minutes`;
    }
    if (hours > 0) {
        str = `${Math.floor(hours)} hours, ${str}`;
    }
    if (days > 0) {
        str = `${Math.floor(days)} days, ${str}`;
    }
    return str;
}

export function parsedUserOrRole(target?: TargetType, key?: string): string {
    if (!(target && key)) return 'N/A';
    return `<@${target === 'role' ? '&' : ''}${key}>`;
}

export function sentByAuthorizedUser(author?: GuildMember | null): boolean {
    return (
        CONFIG.bot.moderatorRoles.findIndex(
            (role) => author?.roles.resolve(role) !== null
        ) >= 0
    );
}

export function getRoleOrUser(args: {
    target?: string;
    targetKey?: string;
}): string | undefined {
    if (args.target === 'role') return `<@&${args.targetKey}>`;
    if (args.target === 'user') return `<@${args.targetKey}>`;
    return args.targetKey;
}
