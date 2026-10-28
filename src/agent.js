import { EventEmitter } from 'node:events';
import pathfinderPackage from 'mineflayer-pathfinder';
import { assertNearby, distance, validateTool, MAX_DISTANCE } from './tools.js';
import { interpret } from './ai.js';
const { Movements, goals } = pathfinderPackage;

export class Agent extends EventEmitter {
  constructor(bot, config, { decide = interpret, log = console.log } = {}) {
    super(); this.bot = bot; this.config = config; this.decide = decide; this.log = log;
    this.ready = false; this.busy = false; this.epoch = 0; this.lastRequest = -Infinity; this.lastReply = -Infinity;
    this.timer = setInterval(() => this.guard(), 200); this.timer.unref();
    bot.on('spawn', () => this.spawn());
    // Use protocol sender identity, never a display-name regex or a system/tellraw message.
    bot._client.on('playerChat', data => {
      const sender = data.sender?.replaceAll('-', '').toLowerCase();
      if (!sender) return;
      const player = Object.values(bot.players).find(p => p.uuid?.replaceAll('-', '').toLowerCase() === sender);
      if (player && typeof data.plainMessage === 'string') void this.onChat(player.username, data.plainMessage);
    });
    bot.on('goal_reached', () => {
      if (this.action === 'goto') { this.stop(); this.reply('Arrived at the destination.'); this.emit('arrived'); }
    });
    bot.on('path_update', result => {
      if (this.action && ['noPath', 'timeout'].includes(result.status)) {
        this.stop(); this.reply('I cannot find a safe path there. Try a closer, open destination.');
      }
    });
    bot.on('death', () => this.cancel());
    bot.on('end', () => { this.cancel(); this.ready = false; clearInterval(this.timer); });
  }
  spawn() {
    this.cancel(); this.anchor = this.bot.entity.position.clone();
    const movements = new Movements(this.bot);
    movements.canDig = false; movements.allow1by1towers = false;
    movements.scafoldingBlocks = []; movements.allowParkour = false;
    movements.allowSprinting = false; movements.canOpenDoors = false;
    movements.maxDropDown = 1; movements.infiniteLiquidDropdownDistance = false;
    this.bot.pathfinder.setMovements(movements);
    this.bot.pathfinder.thinkTimeout = 3000;
    this.bot.pathfinder.tickTimeout = 20;
    this.bot.pathfinder.searchRadius = MAX_DISTANCE;
    this.ready = true; this.log('READY: Joined Minecraft. Type !ai follow me. Emergency stop: !stop'); this.emit('ready');
  }
  authorized(username) {
    if (username !== this.config.player) return false;
    if (this.config.auth === 'offline') return true;
    const uuid = this.bot.players[username]?.uuid?.replaceAll('-', '').toLowerCase();
    return !!uuid && uuid === this.config.playerUuid;
  }
  reply(text) {
    // All messages are application-owned strings, never LLM-generated game commands.
    const message = `[AI] ${text}`;
    this.log(message); this.emit('feedback', text);
    if (!this.ready) return;
    clearTimeout(this.replyTimer);
    const send = () => { if (this.ready) { this.lastReply = Date.now(); this.bot.chat(message); } };
    const wait = Math.max(0, 900 - (Date.now() - this.lastReply));
    if (wait) this.replyTimer = setTimeout(send, wait); else send();
  }
  stop() {
    this.action = null; this.target = null;
    this.bot.pathfinder.setGoal(null); this.bot.clearControlStates();
  }
  cancel() {
    this.epoch++; this.pending?.abort(); this.stop();
  }
  async onChat(username, message) {
    if (!this.ready || !this.authorized(username)) return;
    if (message.trim() === '!stop') { this.cancel(); this.reply('Emergency stop. Pending instructions cancelled.'); return; }
    if (!message.startsWith('!ai ')) return;
    const instruction = message.slice(4).trim();
    if (!instruction || instruction.length > 240) { this.reply('Use one short instruction, up to 240 characters.'); return; }
    if (this.busy || Date.now() - this.lastRequest < 4000) return;
    this.busy = true; this.lastRequest = Date.now(); const epoch = this.epoch;
    this.pending = new AbortController();
    try {
      const decision = validateTool(await this.decide(instruction, this.config.ai, { signal: this.pending.signal }));
      if (epoch !== this.epoch || !this.ready) return;
      this.log(`TOOL: ${decision.tool}${decision.tool === 'goto' ? ` ${decision.x} ${decision.y} ${decision.z}` : ''}`);
      this.emit('decision', decision);
      this.execute(decision);
    } catch (error) {
      if (epoch === this.epoch) { this.stop(); this.reply(error.message.startsWith('AI unavailable') ? error.message : 'The action was rejected safely. Check the request and try again.'); }
    } finally { this.busy = false; }
  }
  execute(decision) {
    validateTool(decision);
    if (decision.tool === 'unsupported') { this.reply('I can only follow you, stop, or go to coordinates. I did not perform that request.'); return; }
    this.stop();
    if (decision.tool === 'stop') { this.reply('Stopped moving.'); return; }
    const target = decision.tool === 'follow' ? this.bot.players[this.config.player]?.entity : null;
    if (decision.tool === 'follow' && !target) { this.reply('I cannot see you. Come closer and try again.'); return; }
    const point = target?.position || decision;
    try { assertNearby(point, this.bot.entity.position, this.anchor); }
    catch { this.reply('Stay within 64 blocks of me and my starting point.'); return; }
    this.action = decision.tool; this.target = target;
    this.deadline = Date.now() + (target ? 120000 : 45000);
    this.bot.pathfinder.setGoal(target ? new goals.GoalFollow(target, 2) : new goals.GoalNear(decision.x, decision.y, decision.z, 1), !!target);
    this.reply(target ? 'Following you for up to two minutes.' : 'Walking to the destination. I will report when I arrive.');
  }
  guard() {
    if (!this.ready || !this.action) return;
    const position = this.bot.entity?.position;
    if (!position || Date.now() > this.deadline || distance(position, this.anchor) > MAX_DISTANCE ||
        (this.target && (this.bot.players[this.config.player]?.entity !== this.target ||
          distance(this.target.position, this.anchor) > MAX_DISTANCE || distance(position, this.target.position) > MAX_DISTANCE))) {
      this.stop(); this.reply('Movement stopped: time limit, distance limit, or player left view.');
    }
  }
  close() { this.cancel(); this.ready = false; clearInterval(this.timer); clearTimeout(this.replyTimer); }
}
