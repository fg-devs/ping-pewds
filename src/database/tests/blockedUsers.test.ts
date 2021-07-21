/* eslint-disable func-names, import/no-extraneous-dependencies */
import { describe, it, after } from 'mocha';
import { assert } from 'chai';
import { CONFIG } from "../../globals";
import DatabaseManager from '../database';

describe('Start standard DatabaseManager', async function () {
    this.timeout(10000);
    let db: DatabaseManager;

    before(function() {
        db = new DatabaseManager({
            host: CONFIG.database.host,
            port: CONFIG.database.port,
            user: CONFIG.database.user,
            database: CONFIG.database.database,
            schema: CONFIG.database.schema + '_test',
            password: CONFIG.database.pass,
            max: CONFIG.database.connections,
        })
    })

    it('should initialize one blocking user', async function() {
        const response = await db.blockedUsers.initializeUsers(1111)
        assert.isTrue(response);
    })

    it('should initialize two blocking users', async function() {
        const response = await db.blockedUsers.initializeUsers([2222, 3333]);
        assert.isTrue(response);
    })

    it('should initialize 100 blocking users', async function() {
        const users = [];
        for (let i = 100; i < 200; i++) users.push(i);
        const response = await db.blockedUsers.initializeUsers(users);
        assert.isTrue(response);
    })

    it('should set last ping for id 1111', async function() {
        const response = await db.blockedUsers.updateLastMessage(1111, new Date().getTime());
        assert.isTrue(response);
    })

    it('should get an absent last ping', async function() {
        const response = await db.blockedUsers.getLastMessage(2222);
        assert.equal(response.getFullYear(), 1969);
    })

    it('should get last ping of id 1111', async function() {
        const response = await db.blockedUsers.getLastMessage(1111);
        assert.equal(response.getFullYear(), new Date().getFullYear());
    })
});