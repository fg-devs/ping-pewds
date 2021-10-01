/* eslint-disable func-names, import/no-extraneous-dependencies */
import { describe, it, after } from 'mocha';
import { assert } from 'chai';
import { CONFIG } from '../../globals';
import DatabaseManager from '../database';

describe('Start punishment history tests', async function () {
    this.timeout(10000);
    let db: DatabaseManager;

    before(function () {
        db = new DatabaseManager({
            host: CONFIG.database.host,
            port: CONFIG.database.port,
            user: CONFIG.database.user,
            database: CONFIG.database.database,
            schema: `${CONFIG.database.schema}_test`,
            password: CONFIG.database.pass,
            max: CONFIG.database.connections,
        });
    });

    it('should create a history item with no expiration', async () => {
        const ending = 1000 * 60 * 10; // 10 minutes
        const created = await db.punishmentHistory.create({
            userId: 1,
            endsAt: new Date(Date.now() + ending).getTime(),
        });

        assert.isTrue(created);
    });

    it('should create a history item with an expiration', async () => {
        const ending = 1000 * 60 * 60; // 1 hour
        const created = await db.punishmentHistory.create({
            userId: 1,
            endsAt: new Date(Date.now() + ending).getTime(),
            expiresAt: new Date(Date.now() + ending * 2).getTime(),
        });

        assert.isTrue(created);
    });

    it('should created ended history item for user 1', async () => {
        const ending = 1000 * 60 * 10; // 10 minutes
        const created = await db.punishmentHistory.create({
            userId: 1,
            endsAt: new Date(Date.now() - ending).getTime(),
        });

        assert.isTrue(created);
    });

    it('should created expired history item for user 1', async () => {
        const ending = 1000 * 60 * 10; // 10 minutes
        const created = await db.punishmentHistory.create({
            userId: 1,
            endsAt: new Date(Date.now() - ending).getTime(),
            expiresAt: new Date(Date.now() - ending).getTime(),
        });

        assert.isTrue(created);
    });

    it('should get only active history items for user 1', async () => {
        const punishments = await db.punishmentHistory.getByUserId(1);
        assert.lengthOf(punishments, 2);
    });

    it('should get all not expired history items for user 1', async () => {
        const punishments = await db.punishmentHistory.getByUserId(1, true);
        assert.lengthOf(punishments, 3);
    });

    it('should get all history items for user 1', async () => {
        const punishments = await db.punishmentHistory.getByUserId(1, true, true);
        assert.lengthOf(punishments, 4);
    });
});
